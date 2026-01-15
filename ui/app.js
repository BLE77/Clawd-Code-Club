/**
 * Claude Code Club - Main Application
 * Orchestrates the minting flow across 5 states
 */

import { connectWallet, disconnectWallet, getWalletBalance, signAndSendTransaction, getWalletState } from './wallet.js';
import { deserializeTransaction, getExplorerUrl, NETWORK } from './solana-client.js';

// Application State
const AppState = {
  WELCOME: 'welcome',           // Initial state - connect GitHub
  ANALYZING: 'analyzing',       // Fetching GitHub data
  PREVIEW: 'preview',           // Show generated Clawd + traits
  READY_TO_MINT: 'mint',        // Wallet connected, ready to mint
  MINTED: 'success'             // Success!
};

// Claude-style loading spinners (exact characters from Claude Code)
const CLAUDE_SPINNERS = ['·', '✢', '✳', '∗', '✻', '✽'];

// Claude-style loading words (from Claude Code)
const CLAUDE_WORDS = [
  'Wibbling...', 'Pondering...', 'Cogitating...', 'Ruminating...', 'Musing...',
  'Noodling...', 'Percolating...', 'Mulling...', 'Deliberating...', 'Contemplating...',
  'Churning...', 'Brewing...', 'Thinking...', 'Computing...', 'Processing...',
  'Calculating...', 'Conjuring...', 'Crafting...', 'Generating...', 'Scheming...',
  'Vibing...', 'Cooking...', 'Simmering...', 'Stewing...', 'Marinating...',
  'Hatching...', 'Forging...', 'Spinning...', 'Weaving...', 'Channelling...'
];

class ClaudeCodeClub {
  constructor() {
    this.state = AppState.WELCOME;
    this.githubUser = null;
    this.traits = null;
    this.walletPublicKey = null;
    this.mintTxSignature = null;
    this.renderer = null;
    this.sessionId = null;  // GitHub OAuth session token
    this.previewHtml = null;  // Cached preview HTML for blob URL
    this.previewBlobUrl = null;  // Blob URL for iframe
    this.wordCycleInterval = null;  // Claude loading word cycle

    this.init();
  }

  // Start Claude-style word cycling
  startWordCycle() {
    const loaderWord = document.getElementById('loader-word');
    const loaderSpinner = document.getElementById('loader-spinner');
    if (!loaderWord) return;

    let wordIndex = 0;
    let spinnerIndex = 0;
    loaderWord.textContent = CLAUDE_WORDS[wordIndex];
    if (loaderSpinner) loaderSpinner.textContent = CLAUDE_SPINNERS[spinnerIndex];

    // Spinner cycles (200ms)
    this.spinnerInterval = setInterval(() => {
      spinnerIndex = (spinnerIndex + 1) % CLAUDE_SPINNERS.length;
      if (loaderSpinner) loaderSpinner.textContent = CLAUDE_SPINNERS[spinnerIndex];
    }, 200);

    // Words cycle slower (400ms)
    this.wordCycleInterval = setInterval(() => {
      wordIndex = (wordIndex + 1) % CLAUDE_WORDS.length;
      loaderWord.textContent = CLAUDE_WORDS[wordIndex];
    }, 400);
  }

  // Stop word cycling
  stopWordCycle() {
    if (this.wordCycleInterval) {
      clearInterval(this.wordCycleInterval);
      this.wordCycleInterval = null;
    }
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  async init() {
    // Set up event listeners
    this.setupEventListeners();

    // Check for stored session
    const storedSession = sessionStorage.getItem('ccc_session');
    if (storedSession) {
      this.sessionId = storedSession;
    }

    // Check if returning from GitHub OAuth
    const urlParams = new URLSearchParams(window.location.search);

    // Handle OAuth error
    if (urlParams.has('error')) {
      this.showError(decodeURIComponent(urlParams.get('error')));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Handle successful OAuth - server redirects with ?session=xxx
    if (urlParams.has('session')) {
      this.sessionId = urlParams.get('session');
      sessionStorage.setItem('ccc_session', this.sessionId);
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      await this.onGitHubCallback();
    } else if (this.sessionId) {
      // Try to restore previous session
      await this.tryRestoreSession();
    }

    // Check if wallet was previously connected
    const savedWallet = localStorage.getItem('ccc_wallet');
    if (savedWallet && this.traits) {
      await this.tryReconnectWallet();
    }

    this.render();
  }

  setupEventListeners() {
    // GitHub connect button
    document.getElementById('btn-connect-github')?.addEventListener('click', () => {
      this.connectGitHub();
    });

    // Wallet connect button
    document.getElementById('btn-connect-wallet')?.addEventListener('click', () => {
      this.connectWalletHandler();
    });

    // Mint button
    document.getElementById('btn-mint')?.addEventListener('click', () => {
      this.mint();
    });

    // Disconnect wallet
    document.getElementById('btn-disconnect-wallet')?.addEventListener('click', () => {
      this.disconnectWalletHandler();
    });

    // Disconnect GitHub
    document.getElementById('btn-disconnect-github')?.addEventListener('click', () => {
      this.disconnectGitHub();
    });

    // View on explorer
    document.getElementById('btn-view-explorer')?.addEventListener('click', () => {
      if (this.mintTxSignature) {
        window.open(`https://explorer.solana.com/tx/${this.mintTxSignature}`, '_blank');
      }
    });

    // Mint another (for demo purposes)
    document.getElementById('btn-mint-another')?.addEventListener('click', () => {
      this.reset();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE TRANSITIONS
  // ═══════════════════════════════════════════════════════════════

  setState(newState) {

    // Stop word cycle when leaving ANALYZING
    if (this.state === AppState.ANALYZING && newState !== AppState.ANALYZING) {
      this.stopWordCycle();
    }

    this.state = newState;
    this.render();

    // Start word cycle when entering ANALYZING
    if (newState === AppState.ANALYZING) {
      this.startWordCycle();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GITHUB AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  connectGitHub() {
    // Redirect to server's GitHub OAuth endpoint
    window.location.href = '/auth/github';
  }

  async disconnectGitHub() {
    // Call server logout endpoint
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout request failed:', e);
    }
    // Clear local state
    this.githubUser = null;
    this.traits = null;
    this.sessionId = null;
    this.previewHtml = null;
    // Clean up blob URL
    if (this.previewBlobUrl) {
      URL.revokeObjectURL(this.previewBlobUrl);
      this.previewBlobUrl = null;
    }
    sessionStorage.clear();
    this.setState(AppState.WELCOME);
  }

  // Helper to make authenticated API calls
  async fetchWithAuth(url, options = {}) {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.sessionId}`
    };
    return fetch(url, { ...options, headers });
  }

  async onGitHubCallback() {
    this.setState(AppState.ANALYZING);

    try {
      if (!this.sessionId) {
        throw new Error('No session token found');
      }

      // Fetch user data from our server (with auth token)
      const userResponse = await this.fetchWithAuth('/api/github/user');
      if (!userResponse.ok) {
        const error = await userResponse.json();
        throw new Error(error.message || 'Failed to fetch GitHub user');
      }
      this.githubUser = await userResponse.json();

      // Fetch traits from server (uses achievement-based overrides from ccc-traits.md)
      const traitsResponse = await this.fetchWithAuth('/api/traits');
      if (!traitsResponse.ok) {
        const error = await traitsResponse.json();
        throw new Error(error.message || 'Failed to generate traits');
      }
      const traitsData = await traitsResponse.json();

      // Use server-generated traits (with proper achievement overrides)
      this.traits = traitsData.traits;
      this.stats = traitsData.stats;
      this.previewHtml = traitsData.previewHtml;

      // Store in session
      sessionStorage.setItem('ccc_github_user', JSON.stringify(this.githubUser));
      sessionStorage.setItem('ccc_traits', JSON.stringify(this.traits));
      sessionStorage.setItem('ccc_stats', JSON.stringify(this.stats));
      sessionStorage.setItem('ccc_previewHtml', this.previewHtml);

      // Render Clawd with traits
      this.renderClawd();

      this.setState(AppState.PREVIEW);
    } catch (error) {
      console.error('GitHub auth error:', error);
      this.showError(error.message || 'Failed to connect GitHub. Please try again.');
      this.sessionId = null;
      sessionStorage.removeItem('ccc_session');
      this.setState(AppState.WELCOME);
    }
  }

  // Try to restore a previous session
  async tryRestoreSession() {
    try {
      const userResponse = await this.fetchWithAuth('/api/github/user');
      if (userResponse.ok) {
        this.githubUser = await userResponse.json();

        // Check for stored traits
        const storedTraits = sessionStorage.getItem('ccc_traits');
        const storedStats = sessionStorage.getItem('ccc_stats');
        const storedPreviewHtml = sessionStorage.getItem('ccc_previewHtml');
        if (storedTraits && storedPreviewHtml) {
          this.traits = JSON.parse(storedTraits);
          if (storedStats) this.stats = JSON.parse(storedStats);
          this.previewHtml = storedPreviewHtml;
          this.setState(AppState.PREVIEW);
          return;
        }

        // Fetch fresh traits from server (with achievement overrides)
        const traitsResponse = await this.fetchWithAuth('/api/traits');
        if (traitsResponse.ok) {
          const traitsData = await traitsResponse.json();
          this.traits = traitsData.traits;
          this.stats = traitsData.stats;
          this.previewHtml = traitsData.previewHtml;
          sessionStorage.setItem('ccc_traits', JSON.stringify(this.traits));
          sessionStorage.setItem('ccc_stats', JSON.stringify(this.stats));
          sessionStorage.setItem('ccc_previewHtml', this.previewHtml);
          this.setState(AppState.PREVIEW);
        }
      } else {
        // Session expired
        this.sessionId = null;
        sessionStorage.removeItem('ccc_session');
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.sessionId = null;
      sessionStorage.removeItem('ccc_session');
    }
  }

  // Generate traits from GitHub stats
  generateTraitsFromStats(stats) {
    const contributions = stats.contributions || {};
    const totalContributions = contributions.totalContributions || 0;
    const commits = contributions.commits || 0;
    const pullRequests = contributions.pullRequests || 0;
    const longestStreak = contributions.longestStreak || 0;

    // Determine stage based on contributions
    let stage = 'Spark';
    if (totalContributions >= 2000) stage = 'Legend';
    else if (totalContributions >= 1000) stage = 'Architect';
    else if (totalContributions >= 500) stage = 'Hacker';
    else if (totalContributions >= 100) stage = 'Coder';

    // Determine rarity based on total activity
    const activityScore = totalContributions + (pullRequests * 5) + (longestStreak * 2);
    let rarity = 'Common';
    if (activityScore >= 5000) rarity = 'Legendary';
    else if (activityScore >= 2000) rarity = 'Epic';
    else if (activityScore >= 1000) rarity = 'Rare';
    else if (activityScore >= 500) rarity = 'Uncommon';

    // Get primary language color
    const topLanguage = stats.languages?.[0]?.language || 'JavaScript';
    const languageColors = {
      'JavaScript': '#f7df1e',
      'TypeScript': '#3178c6',
      'Python': '#3572A5',
      'Rust': '#dea584',
      'Go': '#00ADD8',
      'Ruby': '#CC342D',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'Solidity': '#363636'
    };
    const bodyColor = languageColors[topLanguage] || '#00d4aa';

    return {
      stage,
      rarity,
      bodyColor,
      eyeType: longestStreak > 30 ? 'Focused' : 'Normal',
      aura: pullRequests > 50 ? 'Glowing' : 'Subtle',
      starCount: Math.min(Math.floor(totalContributions / 100), 10),
      topLanguage,
      contributions: totalContributions,
      pullRequests,
      longestStreak
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // WALLET CONNECTION
  // ═══════════════════════════════════════════════════════════════

  async connectWalletHandler() {
    try {
      this.showLoading('Connecting wallet...');
      const publicKey = await connectWallet();

      if (publicKey) {
        this.walletPublicKey = publicKey;
        localStorage.setItem('ccc_wallet', publicKey.toString());

        // Get balance for display
        const balance = await getWalletBalance(publicKey);
        this.walletBalance = balance;

        this.setState(AppState.READY_TO_MINT);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      this.showError(error.message || 'Failed to connect wallet');
    } finally {
      this.hideLoading();
    }
  }

  async tryReconnectWallet() {
    try {
      const walletState = getWalletState();
      if (walletState.isConnected) {
        this.walletPublicKey = walletState.publicKey;
        this.setState(AppState.READY_TO_MINT);
      }
    } catch (error) {
      localStorage.removeItem('ccc_wallet');
    }
  }

  async disconnectWalletHandler() {
    await disconnectWallet();
    this.walletPublicKey = null;
    localStorage.removeItem('ccc_wallet');
    this.setState(AppState.PREVIEW);
  }

  // ═══════════════════════════════════════════════════════════════
  // MINTING
  // ═══════════════════════════════════════════════════════════════

  async mint() {
    if (!this.walletPublicKey || !this.traits) {
      this.showError('Please connect wallet first');
      return;
    }

    try {
      this.showLoading('Building transaction...');

      // Get transaction from server
      const txResponse = await this.fetchWithAuth('/api/mint/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.walletPublicKey.toString()
        })
      });

      if (!txResponse.ok) {
        const error = await txResponse.json();
        throw new Error(error.message || 'Failed to build transaction');
      }

      const { transaction, mintDetails } = await txResponse.json();

      this.showLoading('Please approve in wallet...');

      // Deserialize and sign transaction
      const tx = deserializeTransaction(transaction);
      const signature = await signAndSendTransaction(tx);

      this.showLoading('Confirming transaction...');

      // Verify transaction
      const verifyResponse = await fetch('/api/mint/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature })
      });

      if (!verifyResponse.ok) {
        throw new Error('Transaction verification failed');
      }

      this.mintTxSignature = signature;
      this.setState(AppState.MINTED);

      // Trigger confetti!
      this.celebrateMint();

    } catch (error) {
      console.error('Mint error:', error);
      this.showError(error.message || 'Minting failed. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════

  render() {
    // Hide all state sections
    document.querySelectorAll('.state').forEach(el => {
      el.classList.remove('active');
    });

    // Show current state section
    const stateElement = document.getElementById(`state-${this.state}`);
    if (stateElement) {
      stateElement.classList.add('active');
    }

    // Update dynamic content based on state
    switch (this.state) {
      case AppState.PREVIEW:
        this.renderTraitsDisplay();
        this.renderClawd();
        break;
      case AppState.READY_TO_MINT:
        this.renderTraitsDisplay();
        this.renderClawd();
        this.renderWalletInfo();
        break;
      case AppState.MINTED:
        this.renderMintedInfo();
        break;
    }
  }

  renderClawd() {
    // Load the actual xterm.js artwork in all iframes using blob URL
    if (!this.previewHtml) {
      console.warn('No preview HTML available');
      return;
    }

    // Revoke old blob URL to avoid memory leaks
    if (this.previewBlobUrl) {
      URL.revokeObjectURL(this.previewBlobUrl);
    }

    // Create blob URL from preview HTML
    const blob = new Blob([this.previewHtml], { type: 'text/html' });
    this.previewBlobUrl = URL.createObjectURL(blob);

    // Set the blob URL on all preview iframes
    const previewIframe = document.getElementById('clawd-preview-iframe');
    const mintIframe = document.getElementById('clawd-mint-iframe');
    const successIframe = document.getElementById('clawd-success-iframe');

    if (previewIframe) previewIframe.src = this.previewBlobUrl;
    if (mintIframe) mintIframe.src = this.previewBlobUrl;
    if (successIframe) successIframe.src = this.previewBlobUrl;
  }

  renderTraitsDisplay() {
    if (!this.traits) return;

    // Update trait cards with server-generated traits
    const setElement = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    // Map trait values to display names
    const hatNames = {
      'none': 'None', 'cap': 'Cap 🧢', 'tophat': 'Top Hat 🎩', 'wizardhat': 'Wizard Hat 🧙',
      'devil': 'Devil Horns 😈', 'halo': 'Halo ○', 'crown': 'Crown ♛', 'hoodie': 'Hoodie 🧥',
      'diamond-crown': 'Diamond Crown 💎', 'gold-crown': 'Gold Crown 👑',
      'silver-crown': 'Silver Crown', 'diamond-wizardhat': 'Diamond Wizard 💎',
      'purple-wizardhat': 'Purple Wizard', 'devil-full': 'Devil Full ⛧',
      'ble77': 'BLE77 🛹', 'antenna': 'Antenna ⚆', 'headphones': 'Headphones 🎧',
      'cowboy': 'Cowboy Hat 🤠', 'flowercrown': 'Flower Crown 🌸', 'beanie': 'Beanie 🧶'
    };

    const starStyleNames = {
      'bright': 'Stars ✦', 'swords': 'Swords ⚔', 'music': 'Music 𝄞♪♫', 'none': 'None',
      'unholy': 'Unholy ⸸', 'goth': 'Goth ☠', 'bitcoin': 'Bitcoin ₿', 'diamonds': 'Diamonds ◆'
    };

    // Map hand values to display names
    const handNames = {
      'none': 'None', 'peace': 'Peace ✌︎', 'pen': 'Pen ✎', 'microphone': 'Microphone 🎙',
      'coffee': 'Coffee ☕︎', 'phone': 'Phone 🖥', 'rolex': 'Rolex ⏱', 'adult': '18+ Peeking'
    };

    // Map shoes values to display names
    const shoesNames = {
      'none': 'Barefoot', 'slides': 'Slides', 'crocs': 'Crocs 🐊',
      'heels': 'High Heels 👠', 'jordans': 'Jordans 🔥'
    };

    // Set trait values
    setElement('trait-bodyColor', this.traits.bodyColorName || this.getColorName(this.traits.bodyColor));
    setElement('trait-starStyle', starStyleNames[this.traits.starStyle] || this.traits.starStyle);
    setElement('trait-starColor', this.traits.starColorName || this.traits.starColor?.name || 'White');
    setElement('trait-hat', hatNames[this.traits.hat] || this.traits.hat || 'None');
    setElement('trait-hatColor', this.traits.hatColor?.name || this.traits.hatColorName || 'White');
    setElement('trait-hand', handNames[this.traits.hand] || this.traits.hand || 'None');
    setElement('trait-handColor', this.traits.handColor?.name || this.traits.handColorName || 'White');
    setElement('trait-shoes', shoesNames[this.traits.shoes] || this.traits.shoes || 'Barefoot');
    setElement('trait-shoeColor', this.traits.shoeColor?.name || this.traits.shoeColorName || 'White');
    setElement('rarity-score', this.calculateRarityScore());

    // GitHub stats from server
    if (this.githubUser) {
      setElement('github-username', `@${this.githubUser.login}`);
    }
    const contributions = this.traits.stats?.totalContributions || this.stats?.contributions?.totalContributions;
    setElement('github-commits', contributions?.toLocaleString() || '--');
    setElement('github-language', this.traits.stats?.topLanguage || this.stats?.languages?.[0]?.language || '--');
  }

  calculateRarityScore() {
    if (!this.traits) return '--';
    const rarityScores = {
      'common': 20,
      'uncommon': 40,
      'rare': 60,
      'epic': 80,
      'legendary': 95
    };
    return rarityScores[this.traits.rarity] || 50;
  }

  renderWalletInfo() {
    const walletAddressEl = document.getElementById('wallet-address');
    const walletBalanceEl = document.getElementById('wallet-balance');

    if (walletAddressEl && this.walletPublicKey) {
      const addr = this.walletPublicKey.toString();
      walletAddressEl.textContent = `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    }

    if (walletBalanceEl && this.walletBalance !== undefined) {
      walletBalanceEl.textContent = `${(this.walletBalance / 1e9).toFixed(4)} SOL`;
    }
  }

  renderMintedInfo() {
    const txLinkEl = document.getElementById('tx-signature');
    if (txLinkEl && this.mintTxSignature) {
      txLinkEl.textContent = `${this.mintTxSignature.slice(0, 8)}...${this.mintTxSignature.slice(-8)}`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  getColorName(hex) {
    const colors = {
      // Main body colors
      '#00d4aa': 'Diamond',
      '#ec4899': 'Pink',
      '#8b5cf6': 'Purple',
      '#22c55e': 'Green',
      '#ffffff': 'White',
      '#f97316': 'Orange',
      '#3b82f6': 'Blue',
      '#ef4444': 'Red',
      '#b0b0c0': 'Silver',
      '#eab308': 'Gold',
      '#ffd700': 'Gold',
      '#cc0000': 'Blood Red',
      // Language-based colors
      '#3178c6': 'TypeScript Blue',
      '#f7df1e': 'JavaScript Yellow',
      '#3572A5': 'Python Blue',
      '#dea584': 'Rust Orange',
      '#00ADD8': 'Go Cyan',
      '#CC342D': 'Ruby Red',
      '#b07219': 'Java Brown',
      '#f34b7d': 'C++ Pink',
      '#363636': 'Solidity Gray'
    };
    return colors[hex.toLowerCase()] || colors[hex] || hex;
  }

  showLoading(message = 'Loading...') {
    const loader = document.getElementById('loading-overlay');
    const loaderText = document.getElementById('loading-text');
    if (loader) loader.classList.add('active');
    if (loaderText) loaderText.textContent = message;
  }

  hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.classList.remove('active');
  }

  showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('active');
      setTimeout(() => errorEl.classList.remove('active'), 5000);
    }
  }

  celebrateMint() {
    // Simple confetti effect using CSS animations
    const confettiContainer = document.getElementById('confetti-container');
    if (!confettiContainer) return;

    const colors = ['#00d4aa', '#8b5cf6', '#ec4899', '#f7df1e', '#ffffff'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      confettiContainer.appendChild(confetti);
    }

    // Clean up after animation
    setTimeout(() => {
      confettiContainer.innerHTML = '';
    }, 5000);
  }

  reset() {
    this.githubUser = null;
    this.traits = null;
    this.walletPublicKey = null;
    this.mintTxSignature = null;
    this.sessionId = null;
    this.previewHtml = null;
    // Clean up blob URL
    if (this.previewBlobUrl) {
      URL.revokeObjectURL(this.previewBlobUrl);
      this.previewBlobUrl = null;
    }
    sessionStorage.clear();
    localStorage.removeItem('ccc_wallet');
    this.setState(AppState.WELCOME);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ccc = new ClaudeCodeClub();
});

export { ClaudeCodeClub, AppState };
