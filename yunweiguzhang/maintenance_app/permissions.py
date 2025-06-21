# maintenance_app/permissions.py

from rest_framework import permissions
from .models import User

class IsReporter(permissions.BasePermission):
    """
    允许收费站工作人员访问。
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.ROLE_REPORTER

class IsMaintainer(permissions.BasePermission):
    """
    允许运维人员访问。
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.ROLE_MAINTAINER

class IsAdmin(permissions.BasePermission):
    """
    允许管理员访问。
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.ROLE_ADMIN

class IsMaintainerOrAdmin(permissions.BasePermission):
    """
    允许运维人员或管理员访问。
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               (request.user.role == User.ROLE_MAINTAINER or request.user.role == User.ROLE_ADMIN)

class CanViewMaintenanceRecord(permissions.BasePermission):
    """
    允许查看维修记录的权限：
    - 运维人员可以查看自己处理的维修记录
    - 管理员可以查看所有维修记录
    - 收费站工作人员可以查看自己上报的故障的维修记录
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == User.ROLE_ADMIN:
            return True
        elif user.role == User.ROLE_MAINTAINER:
            return obj.maintainer == user
        elif user.role == User.ROLE_REPORTER:
            return obj.fault.reporter == user
        return False

