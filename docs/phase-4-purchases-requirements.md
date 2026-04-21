# Phase 4 - Purchases Module Requirements

## English

- Document Type: Functional Requirements
- Scope: Purchases Module
- Phase: Phase 4 - Procure-to-Pay
- Total Requirements: 58

This document captures the initial Phase 4 Purchases requirements baseline in the same modular ownership style used by the rest of the project. It remains the planning reference for the full module. Current implementation status: `suppliers` is implemented, `purchase-requests` is implemented, `purchase-orders` is implemented for direct creation, approved-request conversion, draft maintenance, and lifecycle status changes through close, and `purchase-invoices` is implemented for direct/order-linked draft capture, line account classification, and totals calculation; the remaining workflows below are still planning targets.

### Proposed module slices

- `suppliers`
- `purchase-requests`
- `purchase-orders`
- `purchase-invoices`
- `supplier-payments` (implemented)
- `debit-notes` (implemented)
- `posting-accounting`
- `validation-control`

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة المشتريات
- المرحلة: المرحلة الرابعة - الشراء إلى السداد
- إجمالي المتطلبات: 58

هذا الملف يوثّق خط الأساس الأولي لمتطلبات مرحلة المشتريات ضمن نفس أسلوب الملكية المعيارية المستخدم في بقية المشروع. هذه الوثيقة مرجع مواصفات وتخطيط فقط، ولا تعني أن العمليات أدناه تم تنفيذها بعد.

### التقسيم المقترح للوحدات الفرعية

- `suppliers`
- `purchase-requests`
- `purchase-orders`
- `purchase-invoices`
- `supplier-payments` (implemented)
- `debit-notes` (implemented)
- `posting-accounting`
- `validation-control`

## 1. Suppliers | الموردون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-001 | The system shall allow the user to create supplier master records. | يجب أن يسمح النظام للمستخدم بإنشاء بطاقات الموردين الأساسية. |
| REQ-PU-002 | The system shall allow the user to store supplier details such as supplier name, code, contact information, payment terms, tax information, and status. | يجب أن يسمح النظام للمستخدم بحفظ بيانات المورد مثل اسم المورد والرمز وبيانات الاتصال وشروط الدفع والمعلومات الضريبية والحالة. |
| REQ-PU-003 | The system shall allow the user to define a default payable account for each supplier. | يجب أن يسمح النظام للمستخدم بتحديد حساب دائن افتراضي لكل مورد. |
| REQ-PU-004 | The system shall allow the user to define a default currency for each supplier. | يجب أن يسمح النظام للمستخدم بتحديد عملة افتراضية لكل مورد. |
| REQ-PU-005 | The system shall allow the user to edit supplier details before the supplier is deactivated. | يجب أن يسمح النظام للمستخدم بتعديل بيانات المورد قبل تعطيله. |
| REQ-PU-006 | The system shall allow the user to deactivate a supplier while preserving historical transactions. | يجب أن يسمح النظام للمستخدم بتعطيل المورد مع الحفاظ على الحركات التاريخية. |
| REQ-PU-007 | The system shall prevent the selection of deactivated suppliers in new transactions. | يجب أن يمنع النظام اختيار الموردين المعطلين في العمليات الجديدة. |
| REQ-PU-008 | The system shall allow the user to view the transaction history and outstanding balance of each supplier. | يجب أن يسمح النظام للمستخدم بعرض تاريخ الحركات والرصيد المستحق لكل مورد. |

## 2. Purchase Requests | طلبات الشراء

مستند داخلي داخل الشركة.

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-009 | The system shall allow the user to create purchase requests for goods or services needed by the business. | يجب أن يسمح النظام للمستخدم بإنشاء طلبات شراء للسلع أو الخدمات التي تحتاجها الشركة. |
| REQ-PU-010 | The system shall allow the user to save purchase requests in draft status before submission or approval. | يجب أن يسمح النظام للمستخدم بحفظ طلبات الشراء كمسودات قبل التقديم أو الاعتماد. |
| REQ-PU-011 | The system shall require a request date for every purchase request. | يجب أن يطلب النظام تاريخ الطلب لكل طلب شراء. |
| REQ-PU-012 | The system shall allow the user to enter one or multiple requested items or services in a purchase request. | يجب أن يسمح النظام للمستخدم بإدخال بند واحد أو عدة بنود من المواد أو الخدمات في طلب الشراء. |
| REQ-PU-013 | The system shall allow the user to enter quantity, description, requested delivery date, and justification for each request line. | يجب أن يسمح النظام للمستخدم بإدخال الكمية والوصف وتاريخ التسليم المطلوب والمبرر لكل سطر من طلب الشراء. |
| REQ-PU-014 | The system shall assign or require a unique reference number for each purchase request. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل طلب شراء. |
| REQ-PU-015 | The system shall allow an approved purchase request to be converted into a purchase order. | يجب أن يسمح النظام بتحويل طلب الشراء المعتمد إلى أمر شراء. |
| REQ-PU-016 | The system shall maintain the status history of each purchase request, including draft, submitted, approved, rejected, and closed. | يجب أن يحتفظ النظام بسجل حالات كل طلب شراء بما يشمل مسودة ومقدم ومعتمد ومرفوض ومغلق. |

## 3. Purchase Orders | أوامر الشراء

مستند رسمي يصدر بعد الموافقة على الشراء.

Need -> Purchase Request -> Approval -> Purchase Order -> Receipt/Invoice

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-017 | The system shall allow the user to create purchase orders for suppliers. | يجب أن يسمح النظام للمستخدم بإنشاء أوامر شراء للموردين. |
| REQ-PU-018 | The system shall allow the user to generate a purchase order directly or from an approved purchase request. | يجب أن يسمح النظام للمستخدم بإنشاء أمر شراء مباشرة أو من طلب شراء معتمد. |
| REQ-PU-019 | The system shall require supplier selection for every purchase order. | يجب أن يطلب النظام اختيار المورد لكل أمر شراء. |
| REQ-PU-020 | The system shall require a purchase order date for every purchase order. | يجب أن يطلب النظام تاريخ أمر الشراء لكل أمر شراء. |
| REQ-PU-021 | The system shall allow the user to enter one or multiple order lines with item or service description, quantity, unit price, tax, and line total. | يجب أن يسمح النظام للمستخدم بإدخال سطر واحد أو عدة سطور لأمر الشراء تشمل وصف الصنف أو الخدمة والكمية وسعر الوحدة والضريبة وإجمالي السطر. |
| REQ-PU-022 | The system shall assign or require a unique reference number for each purchase order. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل أمر شراء. |
| REQ-PU-023 | The system shall allow the user to save purchase orders in draft status before confirmation. | يجب أن يسمح النظام للمستخدم بحفظ أوامر الشراء كمسودات قبل التأكيد. |
| REQ-PU-024 | The system shall maintain the status of each purchase order, including draft, issued, partially received, fully received, cancelled, and closed. | يجب أن يحتفظ النظام بحالة كل أمر شراء بما يشمل مسودة وصادر ومستلم جزئيًا ومستلم بالكامل وملغى ومغلق. |

## 4. Purchase Invoices | فواتير الشراء

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-025 | The system shall allow the user to record purchase invoices received from suppliers. | يجب أن يسمح النظام للمستخدم بتسجيل فواتير الشراء المستلمة من الموردين. |
| REQ-PU-026 | The system shall allow the user to create a purchase invoice directly or from an existing purchase order. | يجب أن يسمح النظام للمستخدم بإنشاء فاتورة شراء مباشرة أو من أمر شراء موجود. |
| REQ-PU-027 | The system shall require supplier selection for every purchase invoice. | يجب أن يطلب النظام اختيار المورد لكل فاتورة شراء. |
| REQ-PU-028 | The system shall require an invoice date for every purchase invoice. | يجب أن يطلب النظام تاريخ الفاتورة لكل فاتورة شراء. |
| REQ-PU-029 | The system shall require at least one invoice line for every purchase invoice. | يجب أن يطلب النظام وجود سطر فاتورة واحد على الأقل لكل فاتورة شراء. |
| REQ-PU-030 | The system shall allow the user to enter quantity, unit price, tax, discount, and description for each purchase invoice line. | يجب أن يسمح النظام للمستخدم بإدخال الكمية وسعر الوحدة والضريبة والخصم والوصف لكل سطر من فاتورة الشراء. |
| REQ-PU-031 | The system shall allow the user to classify each purchase invoice line to an expense account, inventory account, or other valid account based on configuration. | يجب أن يسمح النظام للمستخدم بتصنيف كل سطر من فاتورة الشراء إلى حساب مصروف أو حساب مخزون أو أي حساب صالح آخر وفقًا للإعدادات. |
| REQ-PU-032 | The system shall calculate invoice subtotal, tax amount, discounts, and total payable amount. | يجب أن يقوم النظام بحساب إجمالي الفاتورة قبل الضريبة وقيمة الضريبة والخصومات وإجمالي المبلغ المستحق. |
| REQ-PU-033 | The system shall assign or require a unique reference number for each purchase invoice. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل فاتورة شراء. |
| REQ-PU-034 | The system shall allow the user to save purchase invoices in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ فواتير الشراء كمسودات قبل الترحيل. |

## 5. Supplier Payments | مدفوعات الموردين

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-035 | The system shall allow the user to record supplier payments for amounts paid to suppliers. | يجب أن يسمح النظام للمستخدم بتسجيل مدفوعات الموردين للمبالغ المدفوعة لهم. |
| REQ-PU-036 | The system shall allow the user to create a supplier payment directly or from one or multiple open purchase invoices. | يجب أن يسمح النظام للمستخدم بإنشاء دفعة مورد مباشرة أو من فاتورة شراء مفتوحة واحدة أو عدة فواتير. |
| REQ-PU-037 | The system shall require the user to select the payment date, supplier, payment amount, and paying bank or cash account. | يجب أن يطلب النظام من المستخدم تحديد تاريخ الدفع والمورد ومبلغ الدفع وحساب البنك أو الصندوق الدافع. |
| REQ-PU-038 | The system shall allow the user to allocate one payment to one or multiple purchase invoices. | يجب أن يسمح النظام للمستخدم بتخصيص دفعة واحدة إلى فاتورة شراء واحدة أو عدة فواتير شراء. |
| REQ-PU-039 | The system shall allow partial payment of a purchase invoice and shall update the remaining payable balance accordingly. | يجب أن يسمح النظام بالسداد الجزئي لفاتورة الشراء وأن يقوم بتحديث الرصيد المتبقي المستحق وفقًا لذلك. |
| REQ-PU-040 | The system shall assign or require a unique reference number for each supplier payment. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل دفعة مورد. |
| REQ-PU-041 | The system shall allow the user to save supplier payments in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ مدفوعات الموردين كمسودات قبل الترحيل. |
| REQ-PU-042 | The system shall integrate supplier payments with the Bank & Cash module when payment is posted. | يجب أن يدمج النظام مدفوعات الموردين مع وحدة البنوك والصندوق عند ترحيل الدفعة. |

## 6. Debit Notes | إشعارات الخصم

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-043 | The system shall allow the user to create debit notes for supplier-related adjustments such as returns, price corrections, or disputed amounts. | يجب أن يسمح النظام للمستخدم بإنشاء إشعارات خصم لتسويات مرتبطة بالموردين مثل المرتجعات أو تصحيحات الأسعار أو المبالغ المتنازع عليها. |
| REQ-PU-044 | The system shall require supplier selection for every debit note. | يجب أن يطلب النظام اختيار المورد لكل إشعار خصم. |
| REQ-PU-045 | The system shall allow the user to reference the related purchase invoice when creating a debit note. | يجب أن يسمح النظام للمستخدم بربط فاتورة الشراء ذات العلاقة عند إنشاء إشعار خصم. |
| REQ-PU-046 | The system shall allow the user to enter quantity, amount, tax, and reason for each debit note line. | يجب أن يسمح النظام للمستخدم بإدخال الكمية والمبلغ والضريبة والسبب لكل سطر من إشعار الخصم. |
| REQ-PU-047 | The system shall assign or require a unique reference number for each debit note. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل إشعار خصم. |
| REQ-PU-048 | The system shall reduce the supplier balance and related payable amount when a debit note is posted. | يجب أن يقوم النظام بتخفيض رصيد المورد والمبلغ المستحق المرتبط به عند ترحيل إشعار الخصم. |

## 7. Posting & Accounting Logic | الترحيل والمنطق المحاسبي

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-049 | The system shall automatically create the related journal entry when a purchase invoice is posted. | يجب أن يقوم النظام تلقائيًا بإنشاء قيد اليومية المرتبط عند ترحيل فاتورة الشراء. |
| REQ-PU-050 | The system shall automatically create the related journal entry when a supplier payment is posted. | يجب أن يقوم النظام تلقائيًا بإنشاء قيد اليومية المرتبط عند ترحيل دفعة المورد. |
| REQ-PU-051 | The system shall automatically create the related journal entry when a debit note is posted. | يجب أن يقوم النظام تلقائيًا بإنشاء قيد اليومية المرتبط عند ترحيل إشعار الخصم. |
| REQ-PU-052 | The system shall update supplier balances and purchase document status after successful posting. | يجب أن يقوم النظام بتحديث أرصدة الموردين وحالة مستندات الشراء بعد نجاح الترحيل. |
| REQ-PU-053 | The system shall change transaction status from draft to posted when posting is completed successfully. | يجب أن يقوم النظام بتغيير حالة العملية من مسودة إلى مرحل عند اكتمال الترحيل بنجاح. |
| REQ-PU-054 | The system shall lock posted purchase invoices, supplier payments, and debit notes so they cannot be edited without proper authorization or reversal. | يجب أن يقوم النظام بقفل فواتير الشراء ومدفوعات الموردين وإشعارات الخصم بعد ترحيلها بحيث لا يمكن تعديلها دون صلاحية مناسبة أو عملية عكس. |

## 8. Validation & Control Rules | قواعد التحقق والرقابة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PU-055 | The system shall prevent posting transactions linked to deactivated suppliers. | يجب أن يمنع النظام ترحيل العمليات المرتبطة بموردين معطلين. |
| REQ-PU-056 | The system shall prevent duplicate reference numbers within the Purchases module according to configured document type rules. | يجب أن يمنع النظام تكرار أرقام المراجع داخل وحدة المشتريات وفقًا لقواعد أنواع المستندات المهيأة. |
| REQ-PU-057 | The system shall prevent payment allocation amounts from exceeding the outstanding balance of the related purchase invoice. | يجب أن يمنع النظام مبالغ تخصيص الدفعات من تجاوز الرصيد المستحق لفاتورة الشراء المرتبطة. |
| REQ-PU-058 | The system shall maintain a history of draft, posted, cancelled, and reversed purchase transactions for audit purposes. | يجب أن يحتفظ النظام بسجل لحركات الشراء في حالات مسودة ومرحل وملغى ومعكوس لأغراض المراجعة والتدقيق. |
