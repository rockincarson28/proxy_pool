# ProxyPool Setup Guide

## Quick Start

### Option 1: Using Docker (Recommended)
```bash
docker-compose up -d
```

### Option 2: Local Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start Redis** (if not using Docker)
   ```bash
   # Install Redis first, then:
   redis-server
   ```

3. **Run ProxyPool**
   ```bash
   # Start both server and scheduler
   python start_local.py
   
   # Or start them separately:
   python proxyPool.py server    # API server on port 5010
   python proxyPool.py schedule  # Proxy fetcher and validator
   ```

## API Endpoints

Once running, the API will be available at `http://localhost:5010`:

- `GET /` - API documentation
- `GET /get` - Get a random proxy
- `GET /get?type=https` - Get an HTTPS-capable proxy
- `GET /pop` - Get and remove a proxy
- `GET /all` - Get all proxies
- `GET /count` - Get proxy statistics
- `GET /delete?proxy=ip:port` - Delete a specific proxy

## Usage Example

```python
import requests

# Get a proxy
response = requests.get("http://localhost:5010/get")
proxy_data = response.json()
print(proxy_data)

# Use the proxy
if proxy_data.get('proxy'):
    proxy = proxy_data['proxy']
    proxies = {
        'http': f'http://{proxy}',
        'https': f'https://{proxy}'
    }
    
    # Make request through proxy
    try:
        r = requests.get('http://httpbin.org/ip', proxies=proxies, timeout=10)
        print(r.json())
    except:
        # Delete bad proxy
        requests.get(f"http://localhost:5010/delete?proxy={proxy}")
```

## Configuration

Edit `setting.py` to customize:
- Database connection
- Proxy sources
- Validation settings
- Server host/port

## Troubleshooting

1. **Redis Connection Error**: Make sure Redis is running
2. **No Proxies Found**: Wait a few minutes for the scheduler to fetch proxies
3. **Port Already in Use**: Change PORT in setting.py