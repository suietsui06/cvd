
`# Tạo thư mục project
mkdir cvd-trading-bot
cd cvd-trading-bot

# Initialize npm

npm init -y

# Tạo cấu trúc thư mục

mkdir src
mkdir src/config
mkdir src/services
mkdir src/models
mkdir src/utils
mkdir src/controllers
mkdir database
mkdir logs
mkdir public
mkdir public/js
mkdir public/css`

# Core dependencies

npm install --save
  ws
  websocket
  mongodb
  mongoose
  express
  dotenv
  discord.js
  node-cron

# Utilities

npm install --save
  moment
  lodash
  axios
  eventemitter3

# Development dependencies

npm install --save-dev
  nodemon
  eslint
  prettier





# 1. Ensure MongoDB is running

# If using Docker:

docker run -d -p 27017:27017 --name mongodb mongo:latest

# 2. Install dependencies

npm install

# 3. Create .env file (copy from example above)

cp .env.example .env

# Edit .env with your settings

# 4. Run in development mode

npm run dev

# 5. Run in production mode

npm start

```

---

### 14. TRUY CẬP
```

🌐 Web Dashboard: http://localhost:3000
📊 API Health: http://localhost:3000/api/health
📈 CVD Data: http://localhost:3000/api/cvd/5m
🎯 Signals: http://localhost:3000/api/signals
