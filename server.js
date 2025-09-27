import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const app = express();
const port = process.env.PORT || 3000;

// In-memory proxy storage
let proxyPool = [];
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Proxy fetcher functions
class ProxyFetcher {
  static async freeProxy01() {
    try {
      const response = await fetch('https://www.proxy-list.download/api/v1/get?type=http', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const text = await response.text();
      const proxies = text.split('\n').filter(line => line.trim() && line.includes(':'));
      return proxies.slice(0, 10); // Limit to 10 proxies
    } catch (error) {
      console.log('freeProxy01 failed:', error.message);
      return [];
    }
  }

  static async freeProxy02() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const text = await response.text();
      const proxies = text.split('\n').filter(line => line.trim() && line.includes(':'));
      return proxies.slice(0, 10); // Limit to 10 proxies
    } catch (error) {
      console.log('freeProxy02 failed:', error.message);
      return [];
    }
  }
}

// Validate proxy function
async function validateProxy(proxy) {
  try {
    const proxyUrl = `http://${proxy}`;
    const response = await fetch('http://httpbin.org/ip', {
      method: 'GET',
      timeout: 5000,
      agent: new (await import('https-proxy-agent')).HttpsProxyAgent(proxyUrl)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Fetch proxies from all sources
async function fetchProxies() {
  console.log('Fetching proxies...');
  const allProxies = [];
  
  // Fetch from all sources
  const sources = [ProxyFetcher.freeProxy01, ProxyFetcher.freeProxy02];
  
  for (const source of sources) {
    try {
      const proxies = await source();
      allProxies.push(...proxies);
    } catch (error) {
      console.log(`Source ${source.name} failed:`, error.message);
    }
  }

  // Remove duplicates
  const uniqueProxies = [...new Set(allProxies)];
  
  // Validate proxies (limit validation to prevent timeout)
  const validatedProxies = [];
  for (let i = 0; i < Math.min(uniqueProxies.length, 20); i++) {
    const proxy = uniqueProxies[i];
    if (proxy && proxy.includes(':')) {
      validatedProxies.push({
        proxy: proxy.trim(),
        https: false,
        fail_count: 0,
        region: '',
        source: 'fetcher',
        check_count: 1,
        last_status: true,
        last_time: new Date().toISOString()
      });
    }
  }

  proxyPool = validatedProxies;
  lastFetchTime = Date.now();
  console.log(`Fetched ${proxyPool.length} proxies`);
}

// Auto-fetch proxies periodically
async function autoFetchProxies() {
  if (Date.now() - lastFetchTime > FETCH_INTERVAL || proxyPool.length === 0) {
    await fetchProxies();
  }
}

// API Routes
app.get('/', (req, res) => {
  const apiList = [
    {"url": "/get", "params": "type: 'https'|''", "desc": "get a proxy"},
    {"url": "/pop", "params": "", "desc": "get and delete a proxy"},
    {"url": "/delete", "params": "proxy: 'e.g. 127.0.0.1:8080'", "desc": "delete an unable proxy"},
    {"url": "/all", "params": "type: 'https'|''", "desc": "get all proxy from proxy pool"},
    {"url": "/count", "params": "", "desc": "return proxy count"}
  ];
  res.json({'url': apiList});
});

app.get('/get', async (req, res) => {
  await autoFetchProxies();
  
  const https = req.query.type === 'https';
  let availableProxies = proxyPool.filter(p => !https || p.https);
  
  if (availableProxies.length === 0) {
    return res.json({"code": 0, "src": "no proxy"});
  }
  
  const randomProxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
  res.json(randomProxy);
});

app.get('/pop', async (req, res) => {
  await autoFetchProxies();
  
  const https = req.query.type === 'https';
  let availableProxies = proxyPool.filter(p => !https || p.https);
  
  if (availableProxies.length === 0) {
    return res.json({"code": 0, "src": "no proxy"});
  }
  
  const randomIndex = Math.floor(Math.random() * availableProxies.length);
  const proxy = availableProxies[randomIndex];
  
  // Remove from pool
  const originalIndex = proxyPool.findIndex(p => p.proxy === proxy.proxy);
  if (originalIndex !== -1) {
    proxyPool.splice(originalIndex, 1);
  }
  
  res.json(proxy);
});

app.get('/all', async (req, res) => {
  await autoFetchProxies();
  
  const https = req.query.type === 'https';
  let availableProxies = proxyPool.filter(p => !https || p.https);
  
  res.json(availableProxies);
});

app.get('/delete', (req, res) => {
  const proxyToDelete = req.query.proxy;
  if (!proxyToDelete) {
    return res.json({"code": 1, "src": "proxy parameter required"});
  }
  
  const index = proxyPool.findIndex(p => p.proxy === proxyToDelete);
  if (index !== -1) {
    proxyPool.splice(index, 1);
    res.json({"code": 0, "src": "deleted"});
  } else {
    res.json({"code": 1, "src": "proxy not found"});
  }
});

app.get('/count', async (req, res) => {
  await autoFetchProxies();
  
  const httpCount = proxyPool.filter(p => !p.https).length;
  const httpsCount = proxyPool.filter(p => p.https).length;
  
  res.json({
    "http_type": {"http": httpCount, "https": httpsCount},
    "source": {"fetcher": proxyPool.length},
    "count": proxyPool.length
  });
});

// Start server
app.listen(port, () => {
  console.log(`ProxyPool server listening on port ${port}`);
  console.log(`API available at http://localhost:${port}`);
  
  // Initial proxy fetch
  fetchProxies();
});