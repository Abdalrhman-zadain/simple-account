# Phase 5 - Inventory Module Requirements

## English

- Document Type: Functional Requirements
- Scope: Inventory Module
- Phase: Phase 5 - Stock Control
- Total Requirements: 60

This document captures the initial Phase 5 Inventory requirements baseline in the same modular ownership style used by the rest of the project. It is a planning and handoff reference only and does not mean the Inventory module is currently implemented. The requirements are grouped by section so review, estimation, discussion, and phased delivery can stay organized.

### Proposed module slices

- `item-master`
- `item-groups`
- `item-categories`
- `units-of-measure`
- `warehouses`
- `goods-receipts`
- `goods-issues`
- `inventory-transfers`
- `inventory-adjustments`
- `costing`
- `stock-ledger-inquiry`
- `posting-accounting`
- `validation-control`

### Master Data Requirements Addendum

- Document Type: Functional Requirements Addendum
- Scope: Inventory Master Data
- Phase: Phase 5 - Stock Control
- Base Requirements: Existing requirements `REQ-INV-001` to `REQ-INV-060`
- Added Requirements: New requirements `REQ-INV-061` to `REQ-INV-100`
- Usage: Append this addendum after the current Phase 5 Inventory requirements baseline.

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة المخزون
- المرحلة: المرحلة الخامسة - التحكم في المخزون
- إجمالي المتطلبات: 60

يوثق هذا المستند خط الأساس الأولي لمتطلبات وحدة المخزون في المرحلة الخامسة بنفس أسلوب الملكية المعيارية المستخدم في بقية المشروع. هذه الوثيقة مرجع للتخطيط والتسليم فقط، ولا تعني أن وحدة المخزون مطبقة حاليًا. تم تقسيم المتطلبات بحسب الأقسام لتسهيل المراجعة والتقدير والنقاش والتنفيذ المرحلي.

### التقسيم المقترح للوحدات الفرعية

- `item-master`
- `item-groups`
- `item-categories`
- `units-of-measure`
- `warehouses`
- `goods-receipts`
- `goods-issues`
- `inventory-transfers`
- `inventory-adjustments`
- `costing`
- `stock-ledger-inquiry`
- `posting-accounting`
- `validation-control`

## 1. Item Master | بطاقة الصنف

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-001 | The system shall allow the user to create inventory item master records. | يجب أن يسمح النظام للمستخدم بإنشاء بطاقات الأصناف الأساسية للمخزون. |
| REQ-INV-002 | The system shall allow the user to store item details such as item name, code, description, unit of measure, item category, and status. | يجب أن يسمح النظام للمستخدم بحفظ بيانات الصنف مثل اسم الصنف والرمز والوصف ووحدة القياس وفئة الصنف والحالة. |
| REQ-INV-003 | The system shall allow the user to classify an item as inventory, non-stock, service, or raw material according to business configuration. | يجب أن يسمح النظام للمستخدم بتصنيف الصنف كمخزني أو غير مخزني أو خدمة أو مادة خام وفقًا لإعدادات العمل. |
| REQ-INV-004 | The system shall allow the user to define default inventory, cost of goods sold, sales, and adjustment accounts for each item or item group. | يجب أن يسمح النظام للمستخدم بتحديد حسابات افتراضية للمخزون وتكلفة البضاعة المباعة والمبيعات والتسويات لكل صنف أو مجموعة أصناف. |
| REQ-INV-005 | The system shall allow the user to define reorder level, reorder quantity, and preferred warehouse for an item. | يجب أن يسمح النظام للمستخدم بتحديد حد إعادة الطلب وكمية إعادة الطلب والمستودع المفضل للصنف. |
| REQ-INV-006 | The system shall allow the user to edit item details before the item is deactivated. | يجب أن يسمح النظام للمستخدم بتعديل بيانات الصنف قبل تعطيله. |
| REQ-INV-007 | The system shall allow the user to deactivate an item while preserving historical inventory transactions. | يجب أن يسمح النظام للمستخدم بتعطيل الصنف مع الحفاظ على الحركات المخزنية التاريخية. |
| REQ-INV-008 | The system shall prevent the selection of deactivated items in new inventory transactions. | يجب أن يمنع النظام اختيار الأصناف المعطلة في الحركات المخزنية الجديدة. |
| REQ-INV-009 | The system shall allow the user to view the current on-hand quantity for each item. | يجب أن يسمح النظام للمستخدم بعرض الكمية المتاحة الحالية لكل صنف. |
| REQ-INV-010 | The system shall allow the user to view inventory valuation summary for each item where costing is enabled. | يجب أن يسمح النظام للمستخدم بعرض ملخص تقييم المخزون لكل صنف عند تفعيل احتساب التكلفة. |

## 2. Warehouses | المستودعات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-011 | The system shall allow the user to create warehouse or inventory location master records. | يجب أن يسمح النظام للمستخدم بإنشاء بطاقات المستودعات أو مواقع التخزين. |
| REQ-INV-012 | The system shall allow the user to store warehouse details such as warehouse name, code, address, responsible person, and status. | يجب أن يسمح النظام للمستخدم بحفظ بيانات المستودع مثل اسم المستودع والرمز والعنوان والمسؤول والحالة. |
| REQ-INV-013 | The system shall allow the user to define a default in-transit or staging location where required by the inventory process. | يجب أن يسمح النظام للمستخدم بتحديد موقع افتراضي للبضاعة تحت النقل أو منطقة تجهيز عندما تتطلب عملية المخزون ذلك. |
| REQ-INV-014 | The system shall allow the user to edit warehouse details before the warehouse is deactivated. | يجب أن يسمح النظام للمستخدم بتعديل بيانات المستودع قبل تعطيله. |
| REQ-INV-015 | The system shall allow the user to deactivate a warehouse while preserving historical stock movements. | يجب أن يسمح النظام للمستخدم بتعطيل المستودع مع الحفاظ على حركات المخزون التاريخية. |
| REQ-INV-016 | The system shall prevent the selection of deactivated warehouses in new inventory transactions. | يجب أن يمنع النظام اختيار المستودعات المعطلة في الحركات المخزنية الجديدة. |

## 3. Goods Receipts | استلامات المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-017 | The system shall allow the user to record goods receipt transactions for inventory received into a selected warehouse. | يجب أن يسمح النظام للمستخدم بتسجيل حركات استلام المخزون للأصناف المستلمة إلى مستودع محدد. |
| REQ-INV-018 | The system shall allow the user to save goods receipt transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات استلام المخزون كمسودات قبل الترحيل. |
| REQ-INV-019 | The system shall require a receipt date and receiving warehouse for every goods receipt transaction. | يجب أن يطلب النظام تاريخ الاستلام والمستودع المستلم لكل حركة استلام مخزون. |
| REQ-INV-020 | The system shall allow the user to reference a purchase order or purchase invoice when creating a goods receipt. | يجب أن يسمح النظام للمستخدم بالربط بأمر شراء أو فاتورة شراء عند إنشاء حركة استلام مخزون. |
| REQ-INV-021 | The system shall allow the user to enter one or more item lines with item, quantity, unit cost, unit of measure, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر واحد أو أكثر يتضمن الصنف والكمية وتكلفة الوحدة ووحدة القياس ووصف السطر. |
| REQ-INV-022 | The system shall assign or require a unique reference number for each goods receipt transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة استلام مخزون. |
| REQ-INV-023 | The system shall update the on-hand quantity of received items in the selected warehouse after posting. | يجب أن يقوم النظام بتحديث الكمية المتاحة للأصناف المستلمة في المستودع المحدد بعد الترحيل. |

## 4. Goods Issues | صرف المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-024 | The system shall allow the user to record goods issue transactions for inventory issued from a selected warehouse. | يجب أن يسمح النظام للمستخدم بتسجيل حركات صرف المخزون للأصناف المصروفة من مستودع محدد. |
| REQ-INV-025 | The system shall allow the user to save goods issue transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات صرف المخزون كمسودات قبل الترحيل. |
| REQ-INV-026 | The system shall require an issue date and issuing warehouse for every goods issue transaction. | يجب أن يطلب النظام تاريخ الصرف والمستودع الصارف لكل حركة صرف مخزون. |
| REQ-INV-027 | The system shall allow the user to reference a sales order, sales invoice, production request, or internal request when creating a goods issue. | يجب أن يسمح النظام للمستخدم بالربط بأمر بيع أو فاتورة بيع أو طلب إنتاج أو طلب داخلي عند إنشاء حركة صرف مخزون. |
| REQ-INV-028 | The system shall allow the user to enter one or more item lines with item, quantity, unit of measure, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر واحد أو أكثر يتضمن الصنف والكمية ووحدة القياس ووصف السطر. |
| REQ-INV-029 | The system shall assign or require a unique reference number for each goods issue transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة صرف مخزون. |

## 5. Inventory Transfers | تحويلات المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-030 | The system shall allow the user to transfer inventory between warehouses or inventory locations. | يجب أن يسمح النظام للمستخدم بتحويل المخزون بين المستودعات أو مواقع التخزين. |
| REQ-INV-031 | The system shall allow the user to save inventory transfer transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات تحويل المخزون كمسودات قبل الترحيل. |
| REQ-INV-032 | The system shall require a transfer date, source warehouse, and destination warehouse for every inventory transfer. | يجب أن يطلب النظام تاريخ التحويل والمستودع المصدر والمستودع الوجهة لكل حركة تحويل مخزون. |
| REQ-INV-033 | The system shall prevent the selection of the same warehouse as both source and destination in one transfer transaction. | يجب أن يمنع النظام اختيار المستودع نفسه كمصدر ووجهة في حركة تحويل واحدة. |
| REQ-INV-034 | The system shall allow the user to enter one or more transfer lines with item, quantity, unit of measure, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر تحويل واحد أو أكثر يتضمن الصنف والكمية ووحدة القياس ووصف السطر. |
| REQ-INV-035 | The system shall assign or require a unique reference number for each inventory transfer transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة تحويل مخزون. |

## 6. Inventory Adjustments | تسويات المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-036 | The system shall allow the user to record inventory adjustment transactions for stock count differences, damage, expiry, or other discrepancies. | يجب أن يسمح النظام للمستخدم بتسجيل حركات تسوية المخزون لفروقات الجرد أو التلف أو انتهاء الصلاحية أو أي فروقات أخرى. |
| REQ-INV-037 | The system shall allow the user to save inventory adjustment transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات تسوية المخزون كمسودات قبل الترحيل. |
| REQ-INV-038 | The system shall require an adjustment date, warehouse, and adjustment reason for every inventory adjustment transaction. | يجب أن يطلب النظام تاريخ التسوية والمستودع وسبب التسوية لكل حركة تسوية مخزون. |
| REQ-INV-039 | The system shall allow the user to enter one or more adjustment lines with item, system quantity, counted quantity, variance quantity, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر تسوية واحد أو أكثر يتضمن الصنف والكمية النظامية والكمية المعدودة وكمية الفرق ووصف السطر. |
| REQ-INV-040 | The system shall support both positive and negative stock adjustments. | يجب أن يدعم النظام تسويات المخزون الموجبة والسالبة. |
| REQ-INV-041 | The system shall assign or require a unique reference number for each inventory adjustment transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة تسوية مخزون. |

## 7. Costing | احتساب التكلفة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-042 | The system shall allow the organization to define the inventory valuation method used by the system. | يجب أن يسمح النظام للمنشأة بتحديد طريقة تقييم المخزون المستخدمة في النظام. |
| REQ-INV-043 | The system shall support configured inventory valuation methods such as FIFO, weighted average cost, or another approved method based on business policy. | يجب أن يدعم النظام طرق تقييم المخزون المهيأة مثل الوارد أولاً يصرف أولاً أو متوسط التكلفة المرجح أو أي طريقة معتمدة أخرى وفق سياسة العمل. |
| REQ-INV-044 | The system shall apply the selected valuation method consistently to inventory receipts, issues, transfers where relevant, and adjustments. | يجب أن يطبق النظام طريقة التقييم المختارة بشكل متسق على استلامات المخزون وصرفه وتحويلاته حيثما كان ذلك مناسبًا وعلى التسويات. |
| REQ-INV-045 | The system shall store cost layers or equivalent valuation records required to calculate item cost and inventory value. | يجب أن يحتفظ النظام بطبقات التكلفة أو سجلات التقييم المكافئة اللازمة لاحتساب تكلفة الصنف وقيمة المخزون. |
| REQ-INV-046 | The system shall calculate item issue cost and remaining inventory value according to the selected valuation method. | يجب أن يقوم النظام باحتساب تكلفة صرف الصنف وقيمة المخزون المتبقية وفق طريقة التقييم المختارة. |

## 8. Stock Ledger & Inquiry | سجل المخزون والاستعلام

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-047 | The system shall allow the user to view stock movement history for a selected item. | يجب أن يسمح النظام للمستخدم بعرض سجل حركات المخزون لصنف محدد. |
| REQ-INV-048 | The system shall allow the user to filter stock movements by warehouse, date range, and transaction type. | يجب أن يسمح النظام للمستخدم بتصفية حركات المخزون حسب المستودع والفترة الزمنية ونوع الحركة. |
| REQ-INV-049 | The system shall display reference number, transaction date, quantity in, quantity out, and running balance for each stock movement. | يجب أن يعرض النظام رقم المرجع وتاريخ الحركة والكمية الداخلة والكمية الخارجة والرصيد الجاري لكل حركة مخزون. |
| REQ-INV-050 | The system shall allow the user to drill down from stock inquiry to the source inventory transaction details. | يجب أن يسمح النظام للمستخدم بالانتقال من استعلام المخزون إلى تفاصيل الحركة المخزنية المصدر. |

## 9. Posting & Accounting Logic | الترحيل والمنطق المحاسبي

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-051 | The system shall automatically create the related accounting entry when a goods receipt transaction is posted and accounting integration is enabled. | يجب أن يقوم النظام تلقائيًا بإنشاء القيد المحاسبي المرتبط عند ترحيل حركة استلام مخزون وعند تفعيل التكامل المحاسبي. |
| REQ-INV-052 | The system shall automatically create the related accounting entry when a goods issue transaction is posted and accounting integration is enabled. | يجب أن يقوم النظام تلقائيًا بإنشاء القيد المحاسبي المرتبط عند ترحيل حركة صرف مخزون وعند تفعيل التكامل المحاسبي. |
| REQ-INV-053 | The system shall automatically create the related accounting entry when an inventory adjustment transaction is posted and accounting integration is enabled. | يجب أن يقوم النظام تلقائيًا بإنشاء القيد المحاسبي المرتبط عند ترحيل حركة تسوية مخزون وعند تفعيل التكامل المحاسبي. |
| REQ-INV-054 | The system shall update stock balances and inventory valuation only when the inventory transaction is posted successfully. | يجب أن يقوم النظام بتحديث أرصدة المخزون وتقييمه فقط عند نجاح ترحيل الحركة المخزنية. |
| REQ-INV-055 | The system shall lock posted inventory transactions so they cannot be edited directly without proper authorization or reversal. | يجب أن يقوم النظام بقفل الحركات المخزنية المرحلة بحيث لا يمكن تعديلها مباشرة دون صلاحية مناسبة أو عملية عكس. |

## 10. Validation & Control Rules | قواعد التحقق والرقابة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-056 | The system shall prevent posting inventory transactions with missing mandatory fields. | يجب أن يمنع النظام ترحيل الحركات المخزنية التي تحتوي على حقول إلزامية مفقودة. |
| REQ-INV-057 | The system shall prevent posting inventory transactions for deactivated items or deactivated warehouses. | يجب أن يمنع النظام ترحيل الحركات المخزنية المرتبطة بأصناف معطلة أو مستودعات معطلة. |
| REQ-INV-058 | The system shall prevent duplicate reference numbers within the same inventory transaction type according to system policy. | يجب أن يمنع النظام تكرار أرقام المراجع داخل نوع الحركة المخزنية نفسه وفق سياسة النظام. |
| REQ-INV-059 | The system shall maintain a history of all draft, posted, reversed, and adjusted inventory transactions for audit purposes. | يجب أن يحتفظ النظام بسجل لجميع الحركات المخزنية في حالات المسودة والمرحلة والمعكوسة والمسوّاة لأغراض المراجعة والتدقيق. |
| REQ-INV-060 | The system shall enforce stock availability rules according to configuration, including prevent-negative-stock policy where enabled. | يجب أن يفرض النظام قواعد توفر المخزون وفق الإعدادات، بما في ذلك سياسة منع المخزون السالب عند تفعيلها. |

# Phase 5 - Inventory Module Requirements Addendum

## Item Groups, Item Categories, Group-Category-Material Hierarchy, Validation, Terminology, and Units of Measure

إضافة منفصلة على متطلبات المرحلة الخامسة للمخزون: مجموعات المواد، فئات المواد، علاقة المجموعة والفئة والمادة، قواعد التحقق، توحيد المصطلحات، ووحدات القياس.

## Addendum Metadata | بيانات الإضافة

| Field | Value |
| --- | --- |
| Document Type | Functional Requirements Addendum |
| Scope | Inventory Master Data |
| Phase | Phase 5 - Stock Control |
| Base Requirements | Existing requirements: `REQ-INV-001` to `REQ-INV-060` |
| Added Requirements | New requirements: `REQ-INV-061` to `REQ-INV-100` |
| Usage | Append this addendum after the current Phase 5 Inventory requirements baseline. |

## 11. Purpose | الهدف

This addendum completes the Inventory Master Data structure by separating item groups, item categories, item/material cards, and units of measure into clear master-data areas. It also standardizes terminology and validates the relationship between group, category, and material.

الهدف من هذه الإضافة هو استكمال بنية البيانات الأساسية للمخزون من خلال فصل مجموعات المواد، فئات المواد، بطاقة المادة، ووحدات القياس، مع توحيد المصطلحات وضبط العلاقة بين المجموعة والفئة والمادة.

## 12. Master Data Structure | هيكل البيانات الأساسي

| Level | English Name | Arabic Name | Purpose |
| --- | --- | --- | --- |
| Level 1 | Item Group | مجموعة المواد | Main inventory grouping such as Office Furniture, Electronics, Raw Materials. |
| Level 2 | Item Category | فئة المادة | Sub-classification under a group such as Chairs, Desks, Printers. |
| Level 3 | Material / Item Card | بطاقة المادة | The actual stock/service/non-stock item used in transactions. |
| Support | Unit of Measure | وحدة القياس | Standard unit used on item cards and inventory transactions. |

Approved hierarchy:

```text
Item Group -> Item Category -> Material / Item Card
```

العلاقة المعتمدة:

```text
مجموعة المواد -> فئة المادة -> بطاقة المادة
```

## 13. Item Groups | مجموعات المواد

| Req ID | English Requirement | المتطلب بالعربية |
| --- | --- | --- |
| REQ-INV-061 | The system shall allow authorized users to create item group master records. | يجب أن يسمح النظام للمستخدمين المصرح لهم بإنشاء سجلات مجموعات المواد. |
| REQ-INV-062 | The system shall store item group details including group code, group name, description, parent group where applicable, and status. | يجب أن يحفظ النظام بيانات مجموعة المواد بما يشمل كود المجموعة، اسم المجموعة، الوصف، المجموعة الأب عند الحاجة، والحالة. |
| REQ-INV-063 | The system shall require a unique item group code for each item group. | يجب أن يطلب النظام كودًا فريدًا لكل مجموعة مواد. |
| REQ-INV-064 | The system shall allow authorized users to edit item group name, description, parent group, and status according to permissions. | يجب أن يسمح النظام للمستخدمين المصرح لهم بتعديل اسم المجموعة، الوصف، المجموعة الأب، والحالة وفق الصلاحيات. |
| REQ-INV-065 | The system shall allow item groups to be deactivated while preserving historical item and transaction records. | يجب أن يسمح النظام بتعطيل مجموعات المواد مع الحفاظ على سجلات المواد والحركات التاريخية. |
| REQ-INV-066 | The system shall prevent deletion of an item group that is linked to item categories, item cards, or historical inventory transactions. | يجب أن يمنع النظام حذف مجموعة مواد مرتبطة بفئات مواد أو بطاقات مواد أو حركات مخزنية تاريخية. |
| REQ-INV-067 | The system shall allow default inventory, sales, cost of goods sold, and adjustment accounts to be defined at item group level where accounting integration is enabled. | يجب أن يسمح النظام بتحديد حسابات افتراضية للمخزون والمبيعات وتكلفة البضاعة المباعة والتسويات على مستوى مجموعة المواد عند تفعيل التكامل المحاسبي. |

## 14. Item Categories | فئات المواد

| Req ID | English Requirement | المتطلب بالعربية |
| --- | --- | --- |
| REQ-INV-068 | The system shall allow authorized users to create item category master records. | يجب أن يسمح النظام للمستخدمين المصرح لهم بإنشاء سجلات فئات المواد. |
| REQ-INV-069 | The system shall store item category details including category code, category name, description, linked item group, and status. | يجب أن يحفظ النظام بيانات فئة المادة بما يشمل كود الفئة، اسم الفئة، الوصف، مجموعة المواد المرتبطة، والحالة. |
| REQ-INV-070 | The system shall require every item category to belong to one active item group at the time of creation. | يجب أن يطلب النظام أن تتبع كل فئة مادة مجموعة مواد فعالة واحدة عند الإنشاء. |
| REQ-INV-071 | The system shall prevent creating an item category without selecting an item group. | يجب أن يمنع النظام إنشاء فئة مادة بدون اختيار مجموعة مواد. |
| REQ-INV-072 | The system shall require a unique item category code according to the system uniqueness policy. | يجب أن يطلب النظام كودًا فريدًا لفئة المادة وفق سياسة التفرد المعتمدة في النظام. |
| REQ-INV-073 | The system shall allow authorized users to edit item category name, description, linked item group, and status according to permissions and usage restrictions. | يجب أن يسمح النظام للمستخدمين المصرح لهم بتعديل اسم الفئة، الوصف، المجموعة المرتبطة، والحالة وفق الصلاحيات وقيود الاستخدام. |
| REQ-INV-074 | The system shall allow item categories to be deactivated while preserving linked item and transaction history. | يجب أن يسمح النظام بتعطيل فئات المواد مع الحفاظ على المواد والحركات التاريخية المرتبطة بها. |
| REQ-INV-075 | The system shall prevent deletion of an item category that is linked to item cards or historical inventory transactions. | يجب أن يمنع النظام حذف فئة مادة مرتبطة ببطاقات مواد أو حركات مخزنية تاريخية. |

## 15. Group -> Category -> Material Hierarchy | علاقة المجموعة والفئة والمادة

| Req ID | English Requirement | المتطلب بالعربية |
| --- | --- | --- |
| REQ-INV-076 | The system shall enforce the hierarchy Item Group -> Item Category -> Material / Item Card. | يجب أن يفرض النظام العلاقة الهرمية: مجموعة المواد ← فئة المادة ← بطاقة المادة. |
| REQ-INV-077 | The system shall require each material / item card to be linked to one item group and one item category. | يجب أن يطلب النظام ربط كل بطاقة مادة بمجموعة مواد واحدة وفئة مادة واحدة. |
| REQ-INV-078 | The system shall require the selected item category on a material / item card to belong to the selected item group. | يجب أن يطلب النظام أن تكون فئة المادة المختارة في بطاقة المادة تابعة لمجموعة المواد المختارة. |
| REQ-INV-079 | The system shall preserve group and category values on historical transactions even if the related master data is later deactivated. | يجب أن يحافظ النظام على قيم المجموعة والفئة في الحركات التاريخية حتى لو تم تعطيل البيانات الأساسية المرتبطة لاحقًا. |
| REQ-INV-080 | The system shall allow item group and item category information to be used in inventory search, filtering, reporting, and inquiry screens. | يجب أن يسمح النظام باستخدام معلومات مجموعة المواد وفئة المادة في شاشات البحث والتصفية والتقارير والاستعلامات المخزنية. |

## 16. Validation Between Group and Category | التحقق بين المجموعة والفئة

| Req ID | English Requirement | المتطلب بالعربية |
| --- | --- | --- |
| REQ-INV-081 | When creating or editing a material / item card, the system shall filter available item categories based on the selected item group. | عند إنشاء أو تعديل بطاقة مادة، يجب أن يقوم النظام بتصفية فئات المواد المتاحة بناءً على مجموعة المواد المختارة. |
| REQ-INV-082 | The system shall prevent saving a material / item card if the selected category does not belong to the selected group. | يجب أن يمنع النظام حفظ بطاقة المادة إذا كانت الفئة المختارة لا تتبع المجموعة المختارة. |
| REQ-INV-083 | The system shall prevent selecting inactive item groups when creating new item categories or new material / item cards. | يجب أن يمنع النظام اختيار مجموعات مواد غير فعالة عند إنشاء فئات مواد جديدة أو بطاقات مواد جديدة. |
| REQ-INV-084 | The system shall prevent selecting inactive item categories when creating new material / item cards. | يجب أن يمنع النظام اختيار فئات مواد غير فعالة عند إنشاء بطاقات مواد جديدة. |
| REQ-INV-085 | If an item group is changed before saving a material / item card, the system shall clear or revalidate the selected item category. | إذا تم تغيير مجموعة المواد قبل حفظ بطاقة المادة، يجب أن يقوم النظام بمسح فئة المادة المختارة أو إعادة التحقق منها. |
| REQ-INV-086 | The system shall display a clear validation message when group/category relationships are invalid. | يجب أن يعرض النظام رسالة تحقق واضحة عندما تكون علاقة المجموعة والفئة غير صحيحة. |

## 17. Terminology Standardization | توحيد المصطلحات

| Req ID | English Requirement | المتطلب بالعربية |
| --- | --- | --- |
| REQ-INV-087 | The system shall use the label "Item Group" in English and "مجموعة المواد" in Arabic for the main inventory grouping level. | يجب أن يستخدم النظام مصطلح "Item Group" بالإنجليزية و"مجموعة المواد" بالعربية لمستوى التصنيف الرئيسي في المخزون. |
| REQ-INV-088 | The system shall use the label "Item Category" in English and "فئة المادة" in Arabic for the sub-classification level under an item group. | يجب أن يستخدم النظام مصطلح "Item Category" بالإنجليزية و"فئة المادة" بالعربية لمستوى التصنيف الفرعي تحت مجموعة المواد. |
| REQ-INV-089 | The system shall use the label "Material / Item Card" in English and "بطاقة المادة" in Arabic for the actual stock, non-stock, service, or raw material record. | يجب أن يستخدم النظام مصطلح "Material / Item Card" بالإنجليزية و"بطاقة المادة" بالعربية للسجل الفعلي للمادة المخزنية أو غير المخزنية أو الخدمة أو المادة الخام. |
| REQ-INV-090 | The system shall avoid using the same Arabic label for item category and material card in the user interface, reports, and validation messages. | يجب أن يتجنب النظام استخدام نفس التسمية العربية لفئة المادة وبطاقة المادة في واجهة المستخدم والتقارير ورسائل التحقق. |

## 18. Units of Measure Master | وحدات القياس

| Req ID | English Requirement | المتطلب بالعربية |
| --- | --- | --- |
| REQ-INV-091 | The system shall allow authorized users to create unit of measure master records. | يجب أن يسمح النظام للمستخدمين المصرح لهم بإنشاء سجلات وحدات القياس. |
| REQ-INV-092 | The system shall store unit of measure details including unit code, unit name, description, unit type where applicable, decimal precision, and status. | يجب أن يحفظ النظام بيانات وحدة القياس بما يشمل كود الوحدة، اسم الوحدة، الوصف، نوع الوحدة عند الحاجة، دقة الكسور العشرية، والحالة. |
| REQ-INV-093 | The system shall require a unique unit of measure code for each unit. | يجب أن يطلب النظام كودًا فريدًا لكل وحدة قياس. |
| REQ-INV-094 | The system shall allow authorized users to edit unit of measure name, description, decimal precision, and status according to permissions and usage restrictions. | يجب أن يسمح النظام للمستخدمين المصرح لهم بتعديل اسم وحدة القياس، الوصف، دقة الكسور العشرية، والحالة وفق الصلاحيات وقيود الاستخدام. |
| REQ-INV-095 | The system shall allow units of measure to be deactivated while preserving historical item and transaction records. | يجب أن يسمح النظام بتعطيل وحدات القياس مع الحفاظ على سجلات المواد والحركات التاريخية. |
| REQ-INV-096 | The system shall prevent selecting inactive units of measure on new material / item cards and new inventory transaction lines. | يجب أن يمنع النظام اختيار وحدات قياس غير فعالة في بطاقات المواد الجديدة أو أسطر الحركات المخزنية الجديدة. |
| REQ-INV-097 | The system shall prevent deletion of a unit of measure that is linked to material / item cards or historical inventory transactions. | يجب أن يمنع النظام حذف وحدة قياس مرتبطة ببطاقات مواد أو حركات مخزنية تاريخية. |
| REQ-INV-098 | The system shall require each material / item card to have one base unit of measure. | يجب أن يطلب النظام أن تحتوي كل بطاقة مادة على وحدة قياس أساسية واحدة. |
| REQ-INV-099 | The system shall use the base unit of measure as the default unit in inventory balances and stock ledger calculations. | يجب أن يستخدم النظام وحدة القياس الأساسية كوحدة افتراضية في أرصدة المخزون واحتساب سجل المخزون. |
| REQ-INV-100 | The system shall allow purchase and sales transaction lines to use the item base unit of measure by default. Item cards may define unit conversion setup for future operational document support, but document-line unit selection and base-quantity storage must not be described as implemented unless that workflow exists in code. | يجب أن يسمح النظام باستخدام وحدة القياس الأساسية للمادة بشكل افتراضي في أسطر الشراء والبيع. يمكن لبطاقات المواد تعريف إعدادات تحويل الوحدات للاستخدام التشغيلي المستقبلي، لكن لا يجوز وصف اختيار الوحدة في أسطر المستندات أو حفظ الكمية الأساسية على أنه مطبق ما لم يكن هذا المسار موجودًا فعليًا في الكود. |

## 19. Suggested Update to Existing Item Master Terminology | تعديل مقترح على مصطلحات بطاقة المادة الحالية

The current Item Master requirements can remain in place, but the Arabic labels should be adjusted to avoid confusion between category and item/material. The following wording is recommended for UI and documentation consistency:

يمكن إبقاء متطلبات `Item Master` الحالية كما هي، لكن يفضل تعديل التسميات العربية لتجنب الخلط بين فئة المادة وبطاقة المادة. يوصى باستخدام الصياغة التالية في الواجهة والتوثيق:

| Current / Risky Label | Recommended Label | Reason |
| --- | --- | --- |
| بطاقة المادة | بطاقة المادة | Avoid confusion with Item Category. |
| الصنف | فئة المادة | Use for category/sub-classification only. |
| اسم الصنف | اسم المادة | Use for the actual item/material record. |
| فئة المادة | فئة المادة | Keep as the category linked to a group. |

## 20. Implementation Notes | ملاحظات تنفيذية

| English Note | الملاحظة بالعربية |
| --- | --- |
| Add new module slice: `item-groups`. | أضف وحدة فرعية جديدة: `item-groups`. |
| Add new module slice: `item-categories`. | أضف وحدة فرعية جديدة: `item-categories`. |
| Add new module slice: `units-of-measure`. | أضف وحدة فرعية جديدة: `units-of-measure`. |
| Keep `item-master` focused on the actual material / item card. | اجعل `item-master` مخصصًا لبطاقة المادة الفعلية. |
| Use `REQ-INV-061` to `REQ-INV-100` as a direct continuation after the existing 60 requirements. | استخدم المتطلبات من `REQ-INV-061` إلى `REQ-INV-100` كاستكمال مباشر بعد المتطلبات الحالية البالغ عددها 60. |
