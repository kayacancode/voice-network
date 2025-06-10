import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

export interface LinkedInConnection {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  profileUrl?: string;
  industry?: string;
  skills?: string[];
  connections?: LinkedInConnection[];
  mutualConnections?: number;
  summary?: string;
}

export class LinkedInScraper {
  private browser?: Browser;
  private page?: Page;
  private isLoggedIn = false;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  async login(email: string, password: string): Promise<void> {
    if (!this.browser || !this.page) {
      await this.initialize();
    }

    try {
      await this.page!.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
      
      // Enter credentials
      await this.page!.type('#username', email);
      await this.page!.type('#password', password);
      
      // Submit login form
      await this.page!.click('button[type="submit"]');
      
      // Wait for redirect to feed or handle 2FA if required
      await this.page!.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if we're on the feed page (successful login)
      const currentUrl = this.page!.url();
      if (currentUrl.includes('/feed/') || currentUrl.includes('/in/')) {
        this.isLoggedIn = true;
        console.log('Successfully logged in to LinkedIn');
      } else {
        throw new Error('Login failed - please check credentials or handle 2FA manually');
      }
    } catch (error) {
      throw new Error(`LinkedIn login failed: ${error}`);
    }
  }

  async getConnections(maxConnections = 500): Promise<LinkedInConnection[]> {
    if (!this.isLoggedIn || !this.page) {
      throw new Error('Must be logged in before fetching connections');
    }

    const connections: LinkedInConnection[] = [];
    
    try {
      // Navigate to connections page
      await this.page.goto('https://www.linkedin.com/mynetwork/invite-connect/connections/', {
        waitUntil: 'networkidle2'
      });

      let loadedConnections = 0;
      
      while (loadedConnections < maxConnections) {
        // Scroll to load more connections
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new connections to load
        await this.page.waitForTimeout(2000);
        
        // Extract connection data from current page
        const pageConnections = await this.extractConnectionsFromPage();
        
        // Add new connections (avoid duplicates)
        const newConnections = pageConnections.filter(
          conn => !connections.some(existing => existing.id === conn.id)
        );
        
        connections.push(...newConnections);
        loadedConnections = connections.length;
        
        console.log(`Loaded ${loadedConnections} connections so far...`);
        
        // Check if we've reached the end
        const hasMoreButton = await this.page.$('button[aria-label="Show more results"]');
        if (!hasMoreButton || loadedConnections >= maxConnections) {
          break;
        }
      }

      console.log(`Successfully extracted ${connections.length} connections`);
      return connections.slice(0, maxConnections);
      
    } catch (error) {
      throw new Error(`Failed to fetch connections: ${error}`);
    }
  }

  async getConnectionsOfConnection(profileUrl: string, maxConnections = 25): Promise<LinkedInConnection[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized');
    }

    try {
      // Navigate to the profile's connections page
      const connectionsUrl = `${profileUrl.replace('/in/', '/in/')}/details/connections/`;
      await this.page.goto(connectionsUrl, { waitUntil: 'networkidle2' });
      
      // Check if connections are visible (privacy settings)
      const isPrivate = await this.page.$('.pv-profile-unavailable');
      if (isPrivate) {
        return [];
      }

      const connections: LinkedInConnection[] = [];
      let loadedConnections = 0;
      
      while (loadedConnections < maxConnections) {
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await this.page.waitForTimeout(1500);
        
        const pageConnections = await this.extractConnectionsFromPage();
        const newConnections = pageConnections.filter(
          conn => !connections.some(existing => existing.id === conn.id)
        );
        
        connections.push(...newConnections);
        loadedConnections = connections.length;
        
        if (loadedConnections >= maxConnections) {
          break;
        }
      }

      return connections.slice(0, maxConnections);
    } catch (error) {
      console.warn(`Failed to fetch connections for ${profileUrl}: ${error}`);
      return [];
    }
  }

  private async extractConnectionsFromPage(): Promise<LinkedInConnection[]> {
    if (!this.page) {
      return [];
    }

    return await this.page.evaluate(() => {
      const connections: LinkedInConnection[] = [];
      
      // Try multiple selectors for different LinkedIn layouts
      const connectionElements = document.querySelectorAll([
        '.mn-connection-card',
        '.reusable-search__result-container',
        '.search-result__wrapper',
        '.entity-result'
      ].join(', '));

      connectionElements.forEach((element, index) => {
        try {
          const nameElement = element.querySelector([
            '.mn-connection-card__name',
            '.entity-result__title-text a',
            '.search-result__result-link',
            '.actor-name'
          ].join(', '));
          
          const titleElement = element.querySelector([
            '.mn-connection-card__occupation',
            '.entity-result__primary-subtitle',
            '.search-result__snippets',
            '.actor-meta'
          ].join(', '));
          
          const profileLinkElement = element.querySelector('a[href*="/in/"]');
          
          if (nameElement && nameElement.textContent) {
            const name = nameElement.textContent.trim();
            const title = titleElement?.textContent?.trim() || '';
            const profileUrl = profileLinkElement?.getAttribute('href') || '';
            
            // Extract company and location from title/subtitle
            const [jobTitle, company] = title.split(' at ');
            
            connections.push({
              id: profileUrl.split('/in/')[1]?.split('/')[0] || `conn_${index}`,
              name,
              title: jobTitle?.trim(),
              company: company?.trim(),
              profileUrl: profileUrl.startsWith('http') ? profileUrl : `https://linkedin.com${profileUrl}`,
              location: '', // Would need additional scraping
              industry: '', // Would need additional scraping
              skills: [], // Would need profile visit
            });
          }
        } catch (error) {
          console.warn('Error extracting connection data:', error);
        }
      });

      return connections;
    });
  }

  async getDetailedProfile(profileUrl: string): Promise<Partial<LinkedInConnection>> {
    if (!this.page) {
      throw new Error('Scraper not initialized');
    }

    try {
      await this.page.goto(profileUrl, { waitUntil: 'networkidle2' });
      
      return await this.page.evaluate(() => {
        const getName = () => {
          const nameElement = document.querySelector('h1');
          return nameElement?.textContent?.trim() || '';
        };

        const getTitle = () => {
          const titleElement = document.querySelector('.text-body-medium.break-words');
          return titleElement?.textContent?.trim() || '';
        };

        const getLocation = () => {
          const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words');
          return locationElement?.textContent?.trim() || '';
        };

        const getSummary = () => {
          const summaryElement = document.querySelector('.pv-shared-text-with-see-more .visually-hidden');
          return summaryElement?.textContent?.trim() || '';
        };

        return {
          name: getName(),
          title: getTitle(),
          location: getLocation(),
          summary: getSummary(),
        };
      });
      
    } catch (error) {
      console.warn(`Failed to get detailed profile for ${profileUrl}: ${error}`);
      return {};
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
} 