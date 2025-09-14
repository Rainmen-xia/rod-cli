/**
 * GitHub API Contracts
 * Defines interfaces for GitHub API interactions
 */

// GitHub API Response Types
export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  label: string;
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
  url: string;
}

// Template Downloader Contract
export interface TemplateDownloader {
  /**
   * Fetch latest release information from GitHub
   */
  getLatestRelease(): Promise<GitHubRelease>;
  
  /**
   * Find template asset for specific AI assistant and script type
   */
  findTemplateAsset(
    release: GitHubRelease, 
    aiAssistant: string, 
    scriptType: string
  ): GitHubAsset | null;
  
  /**
   * Download template file to specified directory
   */
  downloadTemplate(
    asset: GitHubAsset, 
    downloadDir: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string>;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
}

// GitHub API Client Contract
export interface GitHubAPIClient {
  /**
   * Make authenticated request to GitHub API
   */
  request<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  
  /**
   * Download file from URL with progress tracking
   */
  downloadFile(
    url: string, 
    destination: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// Error Types
export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

export class TemplateNotFoundError extends Error {
  constructor(
    aiAssistant: string,
    scriptType: string,
    availableAssets: string[]
  ) {
    super(`Template not found for ${aiAssistant}-${scriptType}. Available: ${availableAssets.join(', ')}`);
    this.name = 'TemplateNotFoundError';
  }
}

export class DownloadError extends Error {
  constructor(
    message: string,
    public url?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

// Configuration
export interface GitHubConfig {
  owner: string;       // 'github'
  repo: string;        // 'spec-kit'  
  baseUrl: string;     // 'https://api.github.com'
  timeout: number;     // Request timeout in ms
  retries: number;     // Number of retry attempts
  userAgent: string;   // User agent string
}

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: 'github',
  repo: 'spec-kit',
  baseUrl: 'https://api.github.com',
  timeout: 30000,
  retries: 3,
  userAgent: 'spec-kit-node-cli'
};

// Rate Limiting
export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

export interface RateLimitedResponse<T> {
  data: T;
  rateLimit: RateLimit;
}