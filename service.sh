#!/bin/bash

SERVICE_NAME="django_maintenance"
PID_FILE="/var/run/django_maintenance.pid"
LOG_FILE="/var/log/django_maintenance.log"

case "$1" in
    start)
        echo "启动Django服务..."
        cd /var/yunweibaozhang/yunweiguzhang
        source venv/bin/activate
        gunicorn --bind 127.0.0.1:8111 --workers 3 --timeout 120 --pid $PID_FILE --log-file $LOG_FILE 故障保修系统.wsgi:application --daemon
        echo "Django服务已启动，PID: $(cat $PID_FILE)"
        ;;
    stop)
        echo "停止Django服务..."
        if [ -f $PID_FILE ]; then
            kill $(cat $PID_FILE)
            rm -f $PID_FILE
            echo "Django服务已停止"
        else
            echo "Django服务未运行"
        fi
        ;;
    restart)
        echo "重启Django服务..."
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        if [ -f $PID_FILE ]; then
            PID=$(cat $PID_FILE)
            if ps -p $PID > /dev/null; then
                echo "Django服务正在运行，PID: $PID"
            else
                echo "Django服务未运行（PID文件存在但进程不存在）"
                rm -f $PID_FILE
            fi
        else
            echo "Django服务未运行"
        fi
        ;;
    logs)
        if [ -f $LOG_FILE ]; then
            tail -f $LOG_FILE
        else
            echo "日志文件不存在: $LOG_FILE"
        fi
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac 