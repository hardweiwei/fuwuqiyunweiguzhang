from django.contrib import admin

# Register your models here.
# maintenance_app/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Route, EquipmentType, Fault, MaintenanceRecord, MaintenancePhoto, Department

# 自定义用户管理界面，显示角色字段
@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        (('用户角色', {'fields': ('role', 'department')}),)
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_staff')
    list_filter = ('role', 'department', 'is_staff', 'is_active')


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'opened_date')
    search_fields = ('name', 'code')

@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

class MaintenancePhotoInline(admin.TabularInline):
    model = MaintenancePhoto
    extra = 1 # 默认显示1个额外的上传框
    readonly_fields = ('uploaded_at',)


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ('fault', 'maintainer', 'arrived_at', 'completed_at', 'created_at')
    search_fields = ('fault__description', 'maintainer__username', 'maintenance_process_result')
    list_filter = ('maintainer', 'completed_at')
    inlines = [MaintenancePhotoInline] # 在维修记录页面直接管理照片


@admin.register(Fault)
class FaultAdmin(admin.ModelAdmin):
    list_display = ('id', 'equipment_name', 'specific_location', 'reporter', 'status', 'urgency', 'reported_at', 'updated_at')
    list_filter = ('status', 'urgency', 'reporter', 'route', 'reported_at')
    search_fields = ('equipment_name', 'specific_location', 'description', 'center_stake_number')
    raw_id_fields = ('reporter', 'route') # 使用ID选择器，当数据量大时更高效


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

