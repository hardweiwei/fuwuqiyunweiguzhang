# maintenance_app/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser # 用于扩展用户模型
import os
import datetime

# 扩展 Django 自带的用户模型，增加角色字段
class User(AbstractUser):
    # 定义用户角色常量
    ROLE_REPORTER = 'reporter'
    ROLE_MAINTAINER = 'maintainer'
    ROLE_ADMIN = 'admin'

    USER_ROLES = [
        (ROLE_REPORTER, '收费站工作人员'),
        (ROLE_MAINTAINER, '运维人员'),
        (ROLE_ADMIN, '系统管理员'),
    ]
    role = models.CharField(max_length=20, choices=USER_ROLES, default=ROLE_REPORTER, verbose_name="用户角色")
    department = models.ForeignKey('Department', null=True, blank=True, on_delete=models.SET_NULL, verbose_name="归属部门")
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='maintenanceapp_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='maintenanceapp_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    class Meta:
        verbose_name = "用户"
        verbose_name_plural = "用户"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Route(models.Model):
    """
    路线信息表
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="路线名称")
    code = models.CharField(max_length=50, unique=True, verbose_name="路线编号")
    opened_date = models.DateField(null=True, blank=True, verbose_name="通车时间")

    class Meta:
        verbose_name = "路线"
        verbose_name_plural = "路线"

    def __str__(self):
        return f"{self.name} ({self.code})"


class EquipmentType(models.Model):
    """
    设备类型字典表
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="设备类型名称")
    description = models.TextField(blank=True, verbose_name="描述")

    class Meta:
        verbose_name = "设备类型"
        verbose_name_plural = "设备类型"

    def __str__(self):
        return self.name


class Fault(models.Model):
    """
    故障上报表
    """
    STATUS_PENDING = 'pending'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_RESOLVED = 'resolved'
    STATUS_CANNOT_RESOLVE = 'cannot_resolve'

    FAULT_STATUS_CHOICES = [
        (STATUS_PENDING, '待处理'),
        (STATUS_IN_PROGRESS, '处理中'),
        (STATUS_RESOLVED, '已解决'),
        (STATUS_CANNOT_RESOLVE, '无法解决'),
    ]

    URGENCY_GENERAL = 'general'
    URGENCY_URGENT = 'urgent'
    URGENCY_VERY_URGENT = 'very_urgent'

    URGENCY_CHOICES = [
        (URGENCY_GENERAL, '一般'),
        (URGENCY_URGENT, '紧急'),
        (URGENCY_VERY_URGENT, '非常紧急'),
    ]

    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reported_faults', verbose_name="上报人")
    route = models.ForeignKey(Route, on_delete=models.SET_NULL, null=True, blank=True, related_name='faults', verbose_name="路线")
    center_stake_number = models.CharField(max_length=50, blank=True, verbose_name="中心桩号")
    equipment_name = models.CharField(max_length=200, verbose_name="故障设备名称") # 可以是自由文本，也可以考虑关联 EquipmentType
    # equipment_type = models.ForeignKey(EquipmentType, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="设备类型")
    specific_location = models.CharField(max_length=255, verbose_name="故障设备具体位置")
    description = models.TextField(verbose_name="故障描述")
    reported_at = models.DateTimeField(auto_now_add=True, verbose_name="上报时间")
    status = models.CharField(max_length=20, choices=FAULT_STATUS_CHOICES, default=STATUS_PENDING, verbose_name="故障状态")
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default=URGENCY_GENERAL, verbose_name="紧急程度")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="最后更新时间")

    class Meta:
        verbose_name = "故障"
        verbose_name_plural = "故障"
        ordering = ['-reported_at'] # 默认按上报时间倒序

    def __str__(self):
        return f"故障ID: {self.id} - {self.equipment_name} ({self.get_status_display()})"


class MaintenanceRecord(models.Model):
    """
    维修记录表
    """
    fault = models.OneToOneField(Fault, on_delete=models.CASCADE, related_name='maintenance_record', verbose_name="对应故障")
    maintainer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='maintained_faults', verbose_name="维护人员")
    arrived_at = models.DateTimeField(null=True, blank=True, verbose_name="维护人员到达现场时间")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="完成维修时间")
    maintenance_vehicle = models.CharField(max_length=100, blank=True, verbose_name="维修车辆")
    required_tools_materials = models.TextField(blank=True, verbose_name="维修及处理所需专用工具、仪器、器材、备件等")
    fault_reason_analysis = models.TextField(blank=True, verbose_name="故障原因分析")
    maintenance_process_result = models.TextField(blank=True, verbose_name="维修过程及结果")
    remarks = models.TextField(blank=True, verbose_name="备注事项")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="记录创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="记录更新时间")

    class Meta:
        verbose_name = "维修记录"
        verbose_name_plural = "维修记录"

    def __str__(self):
        return f"维修记录 (故障ID: {self.fault.id})"


def maintenance_photo_upload_to(instance, filename):
    """
    定义维修照片的上传路径，按故障ID和当前日期组织
    media/fault_photos/fault_<id>/<year>/<month>/<day>/<filename>
    """
    ext = filename.split('.')[-1]
    now = datetime.datetime.now()
    filename = f"{instance.photo_type}_{instance.id or 'temp'}.{ext}"
    return os.path.join(
        'fault_photos',
        f"fault_{instance.maintenance_record.fault.id}",
        str(now.year),
        str(now.month),
        str(now.day),
        filename
    )

class MaintenancePhoto(models.Model):
    """
    维修照片表
    """
    PHOTO_TYPE_BEFORE = 'before'
    PHOTO_TYPE_DURING = 'during'
    PHOTO_TYPE_AFTER = 'after'
    PHOTO_TYPE_OTHER = 'other'

    PHOTO_TYPE_CHOICES = [
        (PHOTO_TYPE_BEFORE, '维修前'),
        (PHOTO_TYPE_DURING, '维修中'),
        (PHOTO_TYPE_AFTER, '维修后'),
        (PHOTO_TYPE_OTHER, '其他'),
    ]

    maintenance_record = models.ForeignKey(MaintenanceRecord, on_delete=models.CASCADE, related_name='photos', verbose_name="对应维修记录")
    image = models.ImageField(upload_to=maintenance_photo_upload_to, verbose_name="照片")
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPE_CHOICES, default=PHOTO_TYPE_OTHER, verbose_name="照片类型")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="上传时间")

    class Meta:
        verbose_name = "维修照片"
        verbose_name_plural = "维修照片"
        ordering = ['uploaded_at']

    def __str__(self):
        return f"照片 (记录ID: {self.maintenance_record.id}, 类型: {self.get_photo_type_display()})"

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="部门名称")
    description = models.TextField(blank=True, verbose_name="描述")

    class Meta:
        verbose_name = "部门"
        verbose_name_plural = "部门"

    def __str__(self):
        return self.name