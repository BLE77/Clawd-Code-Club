/**
 * Wallet Connection Module for Claude Code Club
 * Supports Phantom and Solflare wallets on Solana
 *
 * @module wallet
 */

// Wallet state
let connectedWallet = null;
let walletPublicKey = null;

// Event emitter for wallet state changes
const walletEvents = new EventTarget();

// Wallet types
const WALLET_TYPES = {
    PHANTOM: 'phantom',
    SOLFLARE: 'solflare'
};

// Install URLs
const INSTALL_URLS = {
    phantom: 'https://phantom.app/',
    solflare: 'https://solflare.com/'
};

/**
 * Detect available wallets
 * @returns {Object} Object containing detected wallets
 */
function detectWallets() {
    const wallets = {
        phantom: null,
        solflare: null
    };

    // Check for Phantom wallet
    if (window.phantom?.solana?.isPhantom) {
        wallets.phantom = window.phantom.solana;
    } else if (window.solana?.isPhantom) {
        wallets.phantom = window.solana;
    }

    // Check for Solflare wallet
    if (window.solflare?.isSolflare) {
        wallets.solflare = window.solflare;
    }

    return wallets;
}

/**
 * Get the first available wallet provider
 * @returns {Object|null} Wallet provider or null if none available
 */
function getAvailableWallet() {
    const wallets = detectWallets();

    // Prefer Phantom, then Solflare
    if (wallets.phantom) {
        return { provider: wallets.phantom, type: WALLET_TYPES.PHANTOM };
    }
    if (wallets.solflare) {
        return { provider: wallets.solflare, type: WALLET_TYPES.SOLFLARE };
    }

    return null;
}

/**
 * Check if any wallet is installed
 * @returns {boolean} True if at least one wallet is installed
 */
function isWalletInstalled() {
    const wallets = detectWallets();
    return !!(wallets.phantom || wallets.solflare);
}

/**
 * Show installation message with links
 * @returns {string} HTML string with installation links
 */
function getInstallMessage() {
    return `
        <div class="wallet-install-message">
            <p>No Solana wallet detected. Please install one of the following:</p>
            <ul>
                <li><a href="${INSTALL_URLS.phantom}" target="_blank" rel="noopener noreferrer">Phantom Wallet</a></li>
                <li><a href="${INSTALL_URLS.solflare}" target="_blank" rel="noopener noreferrer">Solflare Wallet</a></li>
            </ul>
        </div>
    `;
}

/**
 * Emit wallet event
 * @param {string} eventType - Type of event (connected, disconnected, error)
 * @param {Object} detail - Event details
 */
function emitWalletEvent(eventType, detail = {}) {
    const event = new CustomEvent(`wallet:${eventType}`, { detail });
    walletEvents.dispatchEvent(event);

    // Also dispatch on window for global listeners
    window.dispatchEvent(new CustomEvent(`wallet:${eventType}`, { detail }));
}

/**
 * Connect to a Solana wallet
 * @param {string} [preferredWallet] - Preferred wallet type ('phantom' or 'solflare')
 * @returns {Promise<string>} The connected wallet's public key as a string
 * @throws {Error} If no wallet is installed or connection fails
 */
async function connectWallet(preferredWallet = null) {
    try {
        // Check if already connected
        if (connectedWallet && walletPublicKey) {
            return walletPublicKey.toString();
        }

        const wallets = detectWallets();
        let wallet = null;
        let walletType = null;

        // Try preferred wallet first
        if (preferredWallet && wallets[preferredWallet]) {
            wallet = wallets[preferredWallet];
            walletType = preferredWallet;
        } else {
            // Get first available wallet
            const available = getAvailableWallet();
            if (available) {
                wallet = available.provider;
                walletType = available.type;
            }
        }

        // No wallet found
        if (!wallet) {
            const error = new Error('No Solana wallet installed');
            error.code = 'NO_WALLET';
            error.installMessage = getInstallMessage();
            emitWalletEvent('error', { error, code: 'NO_WALLET' });
            throw error;
        }

        // Request connection
        const response = await wallet.connect();

        // Store connection info
        connectedWallet = wallet;
        walletPublicKey = response.publicKey;

        // Set up disconnect listener
        wallet.on('disconnect', handleDisconnect);

        // Set up account change listener
        wallet.on('accountChanged', handleAccountChanged);

        // Emit connected event
        emitWalletEvent('connected', {
            publicKey: walletPublicKey.toString(),
            walletType
        });

        return walletPublicKey.toString();

    } catch (error) {
        // Handle user rejection
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            const userError = new Error('User rejected the connection request');
            userError.code = 'USER_REJECTED';
            emitWalletEvent('error', { error: userError, code: 'USER_REJECTED' });
            throw userError;
        }

        // Re-throw if it's our custom error
        if (error.code === 'NO_WALLET') {
            throw error;
        }

        // Handle other errors
        emitWalletEvent('error', { error, code: 'CONNECTION_FAILED' });
        throw error;
    }
}

/**
 * Handle wallet disconnect event
 */
function handleDisconnect() {
    const previousKey = walletPublicKey?.toString();
    connectedWallet = null;
    walletPublicKey = null;

    emitWalletEvent('disconnected', { previousPublicKey: previousKey });
}

/**
 * Handle account change event
 * @param {Object} newPublicKey - New public key or null
 */
function handleAccountChanged(newPublicKey) {
    if (newPublicKey) {
        const previousKey = walletPublicKey?.toString();
        walletPublicKey = newPublicKey;

        emitWalletEvent('accountChanged', {
            previousPublicKey: previousKey,
            newPublicKey: newPublicKey.toString()
        });
    } else {
        // Account changed to nothing means disconnected
        handleDisconnect();
    }
}

/**
 * Disconnect the current wallet
 * @returns {Promise<void>}
 */
async function disconnectWallet() {
    if (!connectedWallet) {
        return;
    }

    try {
        // Remove event listeners
        connectedWallet.off?.('disconnect', handleDisconnect);
        connectedWallet.off?.('accountChanged', handleAccountChanged);

        // Disconnect
        await connectedWallet.disconnect();

        // Clear state (handleDisconnect will be called by the event)
        const previousKey = walletPublicKey?.toString();
        connectedWallet = null;
        walletPublicKey = null;

        emitWalletEvent('disconnected', { previousPublicKey: previousKey });

    } catch (error) {
        // Force clear state even on error
        connectedWallet = null;
        walletPublicKey = null;

        emitWalletEvent('error', { error, code: 'DISCONNECT_FAILED' });
        throw error;
    }
}

/**
 * Get the SOL balance for a wallet
 * @param {string} publicKeyString - The public key to check balance for
 * @param {string} [rpcUrl] - Custom RPC URL (defaults to mainnet)
 * @returns {Promise<number>} Balance in SOL
 */
async function getWalletBalance(publicKeyString, rpcUrl = 'https://api.mainnet-beta.solana.com') {
    if (!publicKeyString) {
        throw new Error('Public key is required');
    }

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [publicKeyString]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'RPC error');
        }

        // Convert lamports to SOL (1 SOL = 1e9 lamports)
        const lamports = data.result?.value || 0;
        const sol = lamports / 1e9;

        return sol;

    } catch (error) {
        emitWalletEvent('error', { error, code: 'BALANCE_FETCH_FAILED' });
        throw error;
    }
}

/**
 * Sign and send a transaction
 * @param {Object} transaction - Solana Transaction object
 * @param {Object} [options] - Transaction options
 * @param {string} [options.rpcUrl] - Custom RPC URL
 * @returns {Promise<string>} Transaction signature
 */
async function signAndSendTransaction(transaction, options = {}) {
    if (!connectedWallet) {
        const error = new Error('Wallet not connected');
        error.code = 'NOT_CONNECTED';
        emitWalletEvent('error', { error, code: 'NOT_CONNECTED' });
        throw error;
    }

    if (!transaction) {
        throw new Error('Transaction is required');
    }

    try {
        // Use wallet's signAndSendTransaction if available
        if (connectedWallet.signAndSendTransaction) {
            const { signature } = await connectedWallet.signAndSendTransaction(transaction, options);

            emitWalletEvent('transactionSent', { signature });
            return signature;
        }

        // Fallback: Sign then send manually
        const signedTransaction = await connectedWallet.signTransaction(transaction);

        // Serialize and send
        const rpcUrl = options.rpcUrl || 'https://api.mainnet-beta.solana.com';
        const serialized = signedTransaction.serialize();

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'sendTransaction',
                params: [
                    Buffer.from(serialized).toString('base64'),
                    { encoding: 'base64' }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Transaction failed');
        }

        const signature = data.result;
        emitWalletEvent('transactionSent', { signature });

        return signature;

    } catch (error) {
        // Handle user rejection
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            const userError = new Error('User rejected the transaction');
            userError.code = 'USER_REJECTED';
            emitWalletEvent('error', { error: userError, code: 'USER_REJECTED' });
            throw userError;
        }

        emitWalletEvent('error', { error, code: 'TRANSACTION_FAILED' });
        throw error;
    }
}

/**
 * Sign a message with the connected wallet
 * @param {string|Uint8Array} message - Message to sign
 * @returns {Promise<Uint8Array>} Signature bytes
 */
async function signMessage(message) {
    if (!connectedWallet) {
        const error = new Error('Wallet not connected');
        error.code = 'NOT_CONNECTED';
        emitWalletEvent('error', { error, code: 'NOT_CONNECTED' });
        throw error;
    }

    try {
        // Convert string to Uint8Array if needed
        const messageBytes = typeof message === 'string'
            ? new TextEncoder().encode(message)
            : message;

        const { signature } = await connectedWallet.signMessage(messageBytes, 'utf8');

        emitWalletEvent('messageSigned', { message: typeof message === 'string' ? message : '[binary]' });

        return signature;

    } catch (error) {
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            const userError = new Error('User rejected the signature request');
            userError.code = 'USER_REJECTED';
            emitWalletEvent('error', { error: userError, code: 'USER_REJECTED' });
            throw userError;
        }

        emitWalletEvent('error', { error, code: 'SIGN_FAILED' });
        throw error;
    }
}

/**
 * Get current wallet connection state
 * @returns {Object} Current wallet state
 */
function getWalletState() {
    return {
        connected: !!connectedWallet,
        publicKey: walletPublicKey?.toString() || null,
        wallet: connectedWallet ? getAvailableWallet()?.type : null
    };
}

/**
 * Subscribe to wallet events
 * @param {string} eventType - Event type (connected, disconnected, error, accountChanged, transactionSent, messageSigned)
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
function onWalletEvent(eventType, callback) {
    const handler = (event) => callback(event.detail);
    walletEvents.addEventListener(`wallet:${eventType}`, handler);

    // Return unsubscribe function
    return () => {
        walletEvents.removeEventListener(`wallet:${eventType}`, handler);
    };
}

/**
 * Format public key for display (truncated)
 * @param {string} publicKey - Full public key
 * @param {number} [chars=4] - Number of characters to show on each end
 * @returns {string} Formatted public key
 */
function formatPublicKey(publicKey, chars = 4) {
    if (!publicKey || publicKey.length < chars * 2 + 3) {
        return publicKey || '';
    }
    return `${publicKey.slice(0, chars)}...${publicKey.slice(-chars)}`;
}

// Export all functions
export {
    connectWallet,
    disconnectWallet,
    getWalletBalance,
    signAndSendTransaction,
    signMessage,
    getWalletState,
    onWalletEvent,
    detectWallets,
    isWalletInstalled,
    getInstallMessage,
    formatPublicKey,
    WALLET_TYPES,
    INSTALL_URLS
};
