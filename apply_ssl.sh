#!/bin/bash

echo "开始申请SSL证书..."

# 检查域名解析
echo "检查域名解析..."
nslookup weidx.cyou

# 检查80端口是否开放
echo "检查80端口..."
netstat -tlnp | grep :80

# 尝试安装certbot
echo "安装certbot..."
if command -v apt &> /dev/null; then
    apt update
    apt install -y certbot python3-certbot-nginx
elif command -v yum &> /dev/null; then
    yum install -y certbot python3-certbot-nginx
elif command -v snap &> /dev/null; then
    snap install --classic certbot
else
    echo "无法安装certbot，请手动安装"
    exit 1
fi

# 申请证书
echo "申请SSL证书..."
certbot certonly --standalone -d weidx.cyou -d www.weidx.cyou --email admin@weidx.cyou --agree-tos --non-interactive

# 检查证书是否申请成功
if [ -f "/etc/letsencrypt/live/weidx.cyou/fullchain.pem" ]; then
    echo "SSL证书申请成功！"
    echo "证书路径: /etc/letsencrypt/live/weidx.cyou/"
    ls -la /etc/letsencrypt/live/weidx.cyou/
else
    echo "SSL证书申请失败！"
    exit 1
fi

echo "证书申请完成！" 