# maintenance_app/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, RouteViewSet, EquipmentTypeViewSet,
    FaultViewSet, MaintenanceRecordViewSet, MaintenancePhotoViewSet,
    FaultStatsView, login_view, logout_view, current_user_view, get_csrf_token,
    DepartmentViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'routes', RouteViewSet)
router.register(r'equipment-types', EquipmentTypeViewSet)
router.register(r'faults', FaultViewSet)
router.register(r'maintenance-records', MaintenanceRecordViewSet)
router.register(r'maintenance-photos', MaintenancePhotoViewSet)
router.register(r'departments', DepartmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('stats/faults/', FaultStatsView.as_view(), name='fault-stats'),
    path('csrf-token/', get_csrf_token, name='csrf-token'),  # 获取CSRF token
    path('login/', login_view, name='api-login'),  # 自定义登录API
    path('logout/', logout_view, name='api-logout'),  # 自定义退出登录API
    path('current-user/', current_user_view, name='current-user'),  # 获取当前用户信息
    # 用于DRF的登录/登出（可选，如果使用Session认证）
    path('auth/', include('rest_framework.urls', namespace='rest_framework')),
]
