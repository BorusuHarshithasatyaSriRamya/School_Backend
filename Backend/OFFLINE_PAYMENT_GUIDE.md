# Offline Payment System Guide

## Overview
The offline payment system allows parents to pay fees in cash at the school office while maintaining digital records and receipts.

## How It Works

### 1. Parent Initiates Offline Payment
**Endpoint:** `POST /api/payments/create-order`
```json
{
  "studentId": "student_id_here",
  "amount": 5000,
  "paymentMethod": "offline"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offline payment request created successfully. Please pay the amount at school office.",
  "feePaymentId": "payment_id_here",
  "paymentMethod": "offline",
  "amount": 5100,
  "lateFee": 100,
  "dueDate": "2025-01-15T00:00:00.000Z"
}
```

### 2. Admin Views Pending Offline Payments
**Endpoint:** `GET /api/payments/pending-offline?page=1&limit=10&search=student_name`

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "_id": "payment_id",
      "student": {
        "name": "John Doe",
        "class": "10",
        "section": "A"
      },
      "parent": {
        "name": "Parent Name",
        "email": "parent@email.com",
        "phone": "1234567890"
      },
      "amountPaid": 5000,
      "lateFee": 100,
      "status": "pending_verification",
      "paymentMethod": "cash",
      "createdAt": "2025-01-10T10:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "totalPages": 1
}
```

### 3. Admin Verifies Payment
**Endpoint:** `POST /api/payments/verify-offline/:paymentId`
```json
{
  "notes": "Payment received in cash at front desk"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offline payment verified successfully",
  "feePayment": {
    "status": "paid",
    "verifiedBy": "admin_id",
    "verifiedAt": "2025-01-10T11:00:00.000Z",
    "receiptUrl": "https://cloudinary.com/receipt.pdf"
  }
}
```

## Payment Statuses

- **`pending`** - Online payment initiated (Razorpay)
- **`pending_verification`** - Offline payment waiting for admin verification
- **`paid`** - Payment completed (online or offline verified)
- **`failed`** - Payment failed
- **`success`** - Legacy status (same as paid)

## Payment Methods

- **`online`** - Razorpay online payment
- **`cash`** - Cash payment at school office
- **`cheque`** - Cheque payment (future enhancement)
- **`bank_transfer`** - Bank transfer (future enhancement)

## Features

✅ **Automatic Receipt Generation** - PDF receipt with school branding
✅ **Email Notification** - Receipt sent to parent's email
✅ **Cloudinary Storage** - Receipts stored securely in cloud
✅ **Admin Verification** - Only admins can verify offline payments
✅ **Search & Pagination** - Easy to find pending payments
✅ **Late Fee Calculation** - Automatic late fee calculation
✅ **Payment History** - Complete payment tracking

## Admin Workflow

1. **View Pending Payments** - Check `/pending-offline` endpoint
2. **Receive Cash** - Parent pays at school office
3. **Verify Payment** - Use `/verify-offline/:paymentId` endpoint
4. **System Automatically**:
   - Updates payment status to "paid"
   - Generates PDF receipt
   - Sends email to parent
   - Stores receipt in Cloudinary

## Parent Experience

1. **Choose Offline Payment** - Select "offline" payment method
2. **Get Confirmation** - System confirms payment request
3. **Pay at School** - Visit school office with payment
4. **Receive Receipt** - Get email with PDF receipt after admin verification

## Security Features

- Only admins can verify offline payments
- All actions are logged with admin ID
- Receipts are digitally signed
- Payment history is immutable
- Email notifications for all transactions

## Future Enhancements

- SMS notifications
- WhatsApp integration for reminders
- Bulk payment verification
- Payment analytics dashboard
- Receipt customization options
