#!/bin/bash

echo "开始部署运维故障管理系统..."

# 进入前端目录
cd /var/yunweibaozhang/frontend

echo "构建前端应用..."
npm run build

if [ $? -ne 0 ]; then
    echo "前端构建失败！"
    exit 1
fi

echo "前端构建完成！"

# 进入后端目录
cd /var/yunweibaozhang/yunweiguzhang

echo "收集静态文件..."
python manage.py collectstatic --noinput

echo "执行数据库迁移..."
python manage.py migrate

echo "启动Django服务..."
# 使用gunicorn启动Django服务
gunicorn --bind 127.0.0.1:8111 --workers 3 --timeout 120 故障保修系统.wsgi:application --daemon

echo "部署完成！"
echo "前端访问地址: https://weidx.cyou"
echo "后端API地址: https://weidx.cyou/api/"
echo "管理后台: https://weidx.cyou/admin/" 