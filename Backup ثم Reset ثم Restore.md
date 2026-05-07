أكيد عمي، هاي صيغة Markdown مرتبة تقدر تحفظها عندك:

# Prisma Reset مع الحفاظ على البيانات

## الفكرة العامة

أمر Prisma التالي:

```bash
npx prisma migrate reset

يقوم بحذف قاعدة البيانات وإعادة بنائها من ملفات الـ migrations.

لذلك إذا تم استخدامه مباشرة، سيتم حذف البيانات الموجودة.

الحل الآمن هو:

Backup Data → Reset Database → Restore Data
متى نستخدم هذه الطريقة؟

استخدم هذه الطريقة إذا:

قاعدة البيانات فيها بيانات مهمة.
يوجد Drift بين Prisma migrations و PostgreSQL database.
تريد إعادة ترتيب قاعدة البيانات حسب migrations بدون خسارة البيانات.
المشروع في مرحلة تطوير لكن لا تريد خسارة الحسابات، الأصناف، الموردين، أو البيانات التجريبية المهمة.
بيانات الاتصال الحالية
Host: localhost
Port: 15432
Database: simple_account
Username: simple_account_user
Password: simple_account_pass
الخطوة 1: أخذ Backup من قاعدة البيانات

من التيرمينال شغّل:

pg_dump -h localhost -p 15432 -U simple_account_user -d simple_account -F c -f simple_account_backup.dump

سيطلب منك كلمة المرور:

simple_account_pass

هذا الأمر ينشئ ملف Backup باسم:

simple_account_backup.dump
الخطوة 2: التأكد أن ملف الـ Backup موجود

شغّل:

ls -lh simple_account_backup.dump

تأكد أن الملف موجود وحجمه ليس صفرًا.

الخطوة 3: عمل Prisma Reset

من داخل فولدر backend شغّل:

npx prisma migrate reset

هذا الأمر سيقوم بـ:

1. حذف الجداول الحالية
2. إعادة بناء قاعدة البيانات حسب ملفات migrations
3. تشغيل seed إذا كان موجودًا
الخطوة 4: توليد Prisma Client

بعد الـ reset شغّل:

npx prisma generate
الخطوة 5: استرجاع البيانات

بعد إعادة بناء قاعدة البيانات، شغّل:

pg_restore -h localhost -p 15432 -U simple_account_user -d simple_account --data-only --disable-triggers simple_account_backup.dump

هذا الأمر يرجع البيانات فقط بدون إعادة إنشاء الجداول.

الخطوة 6: تشغيل الباكند

بعد الانتهاء:

npm run start:dev

ثم جرّب العمليات من الواجهة.

ملاحظات مهمة
1. لا تستخدم migrate reset بدون Backup
npx prisma migrate reset

يمسح البيانات بالكامل إذا لم يكن لديك Backup.

2. قد تحدث مشاكل أثناء Restore

إذا تغيّر شكل الجداول كثيرًا بين النسخة القديمة والجديدة، قد تظهر مشاكل مثل:

Column does not exist
Foreign key constraint failed
Null value violates not-null constraint

في هذه الحالة نحتاج نرجع البيانات بشكل جزئي أو نعدلها قبل الاسترجاع.

3. متى يكون reset مناسبًا؟

إذا كانت البيانات تجريبية وغير مهمة، يمكن استخدام:

npx prisma migrate reset
npx prisma generate
npm run start:dev

بدون restore.

الخلاصة

الطريقة الآمنة هي:

pg_dump -h localhost -p 15432 -U simple_account_user -d simple_account -F c -f simple_account_backup.dump

npx prisma migrate reset

npx prisma generate

pg_restore -h localhost -p 15432 -U simple_account_user -d simple_account --data-only --disable-triggers simple_account_backup.dump

npm run start:dev

بهذه الطريقة نعيد بناء قاعدة البيانات حسب Prisma migrations مع محاولة الحفاظ على البيانات القديمة.


حطها في ملف مثل:

```text
prisma-reset-with-backup.md

````

npx prisma migrate reset --skip-seed     


npx prisma migrate dev --name sync_schema_after_reset

pg_restore -h localhost -p 15432 -U simple_account_user -d simple_account --data-only --disable-triggers ~/simple_account_backup.dump



2026-05-04,OB-001,Opening balance,1000,0
2026-05-04,RCPT-001,قبض من عميل,500,0
2026-05-04,PAY-001,دفع لمورد,0,200
2026-05-04,FEE-001,رسوم بنكية,0,10


