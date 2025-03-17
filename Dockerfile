FROM node:18-alpine

WORKDIR /app

# 首先复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 清理npm缓存并安装依赖
RUN npm cache clean --force && \
    npm install && \
    npm install mongoose@8.1.3 --save-exact && \
    npm install cheerio@1.0.0-rc.12 --save-exact

# 然后复制其他文件
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"] 