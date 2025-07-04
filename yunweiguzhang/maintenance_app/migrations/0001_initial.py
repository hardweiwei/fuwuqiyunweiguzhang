# Generated by Django 4.2.23 on 2025-06-21 04:23

from django.conf import settings
import django.contrib.auth.models
import django.contrib.auth.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import maintenance_app.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='email address')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('role', models.CharField(choices=[('reporter', '收费站工作人员'), ('maintainer', '运维人员'), ('admin', '系统管理员')], default='reporter', max_length=20, verbose_name='用户角色')),
            ],
            options={
                'verbose_name': '用户',
                'verbose_name_plural': '用户',
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='Department',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='部门名称')),
                ('description', models.TextField(blank=True, verbose_name='描述')),
            ],
            options={
                'verbose_name': '部门',
                'verbose_name_plural': '部门',
            },
        ),
        migrations.CreateModel(
            name='EquipmentType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='设备类型名称')),
                ('description', models.TextField(blank=True, verbose_name='描述')),
            ],
            options={
                'verbose_name': '设备类型',
                'verbose_name_plural': '设备类型',
            },
        ),
        migrations.CreateModel(
            name='Fault',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('center_stake_number', models.CharField(blank=True, max_length=50, verbose_name='中心桩号')),
                ('equipment_name', models.CharField(max_length=200, verbose_name='故障设备名称')),
                ('specific_location', models.CharField(max_length=255, verbose_name='故障设备具体位置')),
                ('description', models.TextField(verbose_name='故障描述')),
                ('reported_at', models.DateTimeField(auto_now_add=True, verbose_name='上报时间')),
                ('status', models.CharField(choices=[('pending', '待处理'), ('in_progress', '处理中'), ('resolved', '已解决'), ('cannot_resolve', '无法解决')], default='pending', max_length=20, verbose_name='故障状态')),
                ('urgency', models.CharField(choices=[('general', '一般'), ('urgent', '紧急'), ('very_urgent', '非常紧急')], default='general', max_length=20, verbose_name='紧急程度')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='最后更新时间')),
                ('reporter', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reported_faults', to=settings.AUTH_USER_MODEL, verbose_name='上报人')),
            ],
            options={
                'verbose_name': '故障',
                'verbose_name_plural': '故障',
                'ordering': ['-reported_at'],
            },
        ),
        migrations.CreateModel(
            name='Route',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='路线名称')),
                ('code', models.CharField(max_length=50, unique=True, verbose_name='路线编号')),
                ('opened_date', models.DateField(blank=True, null=True, verbose_name='通车时间')),
            ],
            options={
                'verbose_name': '路线',
                'verbose_name_plural': '路线',
            },
        ),
        migrations.CreateModel(
            name='MaintenanceRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('arrived_at', models.DateTimeField(blank=True, null=True, verbose_name='维护人员到达现场时间')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='完成维修时间')),
                ('maintenance_vehicle', models.CharField(blank=True, max_length=100, verbose_name='维修车辆')),
                ('required_tools_materials', models.TextField(blank=True, verbose_name='维修及处理所需专用工具、仪器、器材、备件等')),
                ('fault_reason_analysis', models.TextField(blank=True, verbose_name='故障原因分析')),
                ('maintenance_process_result', models.TextField(blank=True, verbose_name='维修过程及结果')),
                ('remarks', models.TextField(blank=True, verbose_name='备注事项')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='记录创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='记录更新时间')),
                ('fault', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='maintenance_record', to='maintenance_app.fault', verbose_name='对应故障')),
                ('maintainer', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='maintained_faults', to=settings.AUTH_USER_MODEL, verbose_name='维护人员')),
            ],
            options={
                'verbose_name': '维修记录',
                'verbose_name_plural': '维修记录',
            },
        ),
        migrations.CreateModel(
            name='MaintenancePhoto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to=maintenance_app.models.maintenance_photo_upload_to, verbose_name='照片')),
                ('photo_type', models.CharField(choices=[('before', '维修前'), ('during', '维修中'), ('after', '维修后'), ('other', '其他')], default='other', max_length=20, verbose_name='照片类型')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='上传时间')),
                ('maintenance_record', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='photos', to='maintenance_app.maintenancerecord', verbose_name='对应维修记录')),
            ],
            options={
                'verbose_name': '维修照片',
                'verbose_name_plural': '维修照片',
                'ordering': ['uploaded_at'],
            },
        ),
        migrations.AddField(
            model_name='fault',
            name='route',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='faults', to='maintenance_app.route', verbose_name='路线'),
        ),
        migrations.AddField(
            model_name='user',
            name='department',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='maintenance_app.department', verbose_name='归属部门'),
        ),
        migrations.AddField(
            model_name='user',
            name='groups',
            field=models.ManyToManyField(blank=True, help_text='The groups this user belongs to.', related_name='maintenanceapp_user_set', to='auth.group', verbose_name='groups'),
        ),
        migrations.AddField(
            model_name='user',
            name='user_permissions',
            field=models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='maintenanceapp_user_set', to='auth.permission', verbose_name='user permissions'),
        ),
    ]
