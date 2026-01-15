/**
 * GitHub API logic for OAuth and data fetching
 */

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Build GitHub OAuth authorization URL
 */
export function getAuthorizationUrl(clientId, redirectUri) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email repo',
    state: generateState()
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Generate random state for OAuth security
 */
function generateState() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(clientId, clientSecret, code) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.access_token;
}

/**
 * Get user profile from GitHub
 */
export async function getUserProfile(accessToken) {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return response.json();
}

/**
 * Get user's repositories
 */
export async function getUserRepos(accessToken, perPage = 100) {
  const response = await fetch(
    `${GITHUB_API_URL}/user/repos?per_page=${perPage}&sort=updated&affiliation=owner,collaborator`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user repositories');
  }

  return response.json();
}

/**
 * Get top languages from user's repositories
 */
export async function getTopLanguages(accessToken, limit = 5) {
  const repos = await getUserRepos(accessToken);

  // Aggregate language bytes across all repos
  const languageBytes = {};

  for (const repo of repos) {
    if (repo.language) {
      languageBytes[repo.language] = (languageBytes[repo.language] || 0) + (repo.size || 1);
    }
  }

  // Sort by bytes and take top N
  const sortedLanguages = Object.entries(languageBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([language, bytes]) => ({ language, bytes }));

  // Calculate percentages
  const totalBytes = sortedLanguages.reduce((sum, lang) => sum + lang.bytes, 0);

  return sortedLanguages.map(lang => ({
    language: lang.language,
    percentage: Math.round((lang.bytes / totalBytes) * 100)
  }));
}

/**
 * Get contribution stats using GraphQL API
 */
export async function getContributionStats(accessToken, username) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          totalRepositoryContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
        repositories(first: 100, ownerAffiliations: [OWNER, COLLABORATOR]) {
          totalCount
        }
        followers {
          totalCount
        }
        following {
          totalCount
        }
        starredRepositories {
          totalCount
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { username }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch contribution stats');
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  const user = result.data.user;
  const contributions = user.contributionsCollection;
  const calendar = contributions.contributionCalendar;

  // Calculate longest streak
  const streak = calculateLongestStreak(calendar.weeks);

  return {
    totalContributions: calendar.totalContributions,
    commits: contributions.totalCommitContributions,
    pullRequests: contributions.totalPullRequestContributions,
    issues: contributions.totalIssueContributions,
    repositoriesCreated: contributions.totalRepositoryContributions,
    totalRepositories: user.repositories.totalCount,
    followers: user.followers.totalCount,
    following: user.following.totalCount,
    starsGiven: user.starredRepositories.totalCount,
    longestStreak: streak.longest,
    currentStreak: streak.current
  };
}

/**
 * Calculate longest and current contribution streak
 */
export function calculateLongestStreak(weeks) {
  // Flatten all days into a single array
  const allDays = weeks.flatMap(week => week.contributionDays);

  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < allDays.length; i++) {
    const day = allDays[i];

    if (day.contributionCount > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);

      // Check if this is part of current streak (today or yesterday onwards)
      if (day.date === today || isRecentContribution(day.date, allDays, i)) {
        currentStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  return {
    longest: longestStreak,
    current: currentStreak
  };
}

/**
 * Check if a contribution is part of the current streak
 */
function isRecentContribution(date, allDays, currentIndex) {
  const today = new Date();
  const contributionDate = new Date(date);
  const daysDiff = Math.floor((today - contributionDate) / (1000 * 60 * 60 * 24));

  // If within 1 day and all subsequent days have contributions
  if (daysDiff <= 1) {
    for (let i = currentIndex + 1; i < allDays.length; i++) {
      if (allDays[i].contributionCount === 0) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Get max stars on user's owned (non-fork) repositories
 * Used for achievement detection
 */
export async function getMaxRepoStars(accessToken) {
  const repos = await getUserRepos(accessToken);

  let maxStars = 0;
  let topRepo = null;

  for (const repo of repos) {
    // Only count non-fork repos the user owns
    if (!repo.fork && repo.owner && repo.stargazers_count > maxStars) {
      maxStars = repo.stargazers_count;
      topRepo = repo.full_name;
    }
  }

  return { maxStars, topRepo };
}

/**
 * Check for merged PRs to high-star repositories
 * Returns max star count of repos user has contributed PRs to
 */
export async function getMaxPRRepoStars(accessToken, username) {
  try {
    // Search for merged PRs by this user to other repos
    const searchUrl = `${GITHUB_API_URL}/search/issues?q=author:${username}+is:pr+is:merged+-user:${username}&per_page=30`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      console.error('Failed to search PRs:', response.status);
      return { maxStars: 0, topRepo: null };
    }

    const data = await response.json();
    let maxStars = 0;
    let topRepo = null;

    // Check star count for each repo with merged PRs
    for (const pr of data.items || []) {
      if (pr.repository_url) {
        try {
          const repoResponse = await fetch(pr.repository_url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (repoResponse.ok) {
            const repo = await repoResponse.json();
            if (repo.stargazers_count > maxStars) {
              maxStars = repo.stargazers_count;
              topRepo = repo.full_name;
            }
          }
        } catch (e) {
          // Skip this repo if we can't fetch it
          continue;
        }
      }
    }

    return { maxStars, topRepo };
  } catch (error) {
    console.error('Error fetching PR repo stars:', error);
    return { maxStars: 0, topRepo: null };
  }
}

/**
 * Detect achievements based on GitHub stats
 */
export function detectAchievements(maxRepoStars, maxPRRepoStars) {
  return {
    // Owned repo achievements
    hasCreated100kRepo: maxRepoStars >= 100000,
    hasCreated10kRepo: maxRepoStars >= 10000,
    hasCreated1kRepo: maxRepoStars >= 1000,
    hasCreated100Repo: maxRepoStars >= 100,
    maxRepoStars,

    // PR achievements
    hasPRto100kRepo: maxPRRepoStars >= 100000,
    hasPRto10kRepo: maxPRRepoStars >= 10000,
    hasPRto1kRepo: maxPRRepoStars >= 1000,
    maxPRRepoStars,

    // Determine highest achievement for display
    highestAchievement: getHighestAchievement(maxRepoStars, maxPRRepoStars)
  };
}

/**
 * Get the highest achievement tier
 */
function getHighestAchievement(maxRepoStars, maxPRRepoStars) {
  if (maxRepoStars >= 100000) return { type: 'created', tier: 'diamond', stars: maxRepoStars, reward: 'Full Diamond Set' };
  if (maxPRRepoStars >= 100000) return { type: 'pr', tier: 'diamond', stars: maxPRRepoStars, reward: 'Diamond Wizard Hat' };
  if (maxRepoStars >= 10000) return { type: 'created', tier: 'gold', stars: maxRepoStars, reward: 'Gold Crown' };
  if (maxPRRepoStars >= 10000) return { type: 'pr', tier: 'purple', stars: maxPRRepoStars, reward: 'Purple Wizard Hat' };
  if (maxRepoStars >= 1000) return { type: 'created', tier: 'silver', stars: maxRepoStars, reward: 'Silver Crown' };
  if (maxPRRepoStars >= 1000) return { type: 'pr', tier: 'tophat', stars: maxPRRepoStars, reward: 'Top Hat' };
  if (maxRepoStars >= 100) return { type: 'created', tier: 'cap', stars: maxRepoStars, reward: 'Cap' };
  return null;
}

/**
 * Get complete user stats
 */
export async function getCompleteStats(accessToken) {
  const profile = await getUserProfile(accessToken);
  const topLanguages = await getTopLanguages(accessToken);
  const contributionStats = await getContributionStats(accessToken, profile.login);

  // Fetch achievement data
  const repoStars = await getMaxRepoStars(accessToken);
  const prRepoStars = await getMaxPRRepoStars(accessToken, profile.login);
  const achievements = detectAchievements(repoStars.maxStars, prRepoStars.maxStars);

  return {
    profile: {
      id: profile.id,
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      company: profile.company,
      location: profile.location,
      blog: profile.blog,
      createdAt: profile.created_at,
      publicRepos: profile.public_repos,
      publicGists: profile.public_gists
    },
    languages: topLanguages,
    contributions: contributionStats,
    achievements: {
      ...achievements,
      topOwnedRepo: repoStars.topRepo,
      topPRRepo: prRepoStars.topRepo
    }
  };
}
