# Certificate Issuance Feature Guide

## Overview

The Certificate Issuance feature allows verified organizations to issue certificates directly to the database instead of just generating PDF files. This feature is only available for organizations with "approved" status. However, the feature is visible to all users to encourage organization registration and showcase the platform's capabilities.

## Features

### 1. Certificate Issue Mode Toggle

- **Location**: Bulk Generation Modal
- **Availability**: Visible to all users, but only functional for verified organizations (status: "approved")
- **Description**: A toggle switch that enables certificate issuance mode
- **Non-organization users**: Can see the feature but it's disabled with a call-to-action to register as an organization

### 2. Recipient Email Field

When Certificate Issue Mode is enabled:
- A new "Recipient Email" column appears in the bulk generation table
- This field is **required** for all rows (for verified organizations)
- Email validation is enforced
- The field is marked with a red "Required" chip
- **Non-organization users**: Field is visible but disabled with placeholder text indicating organization requirement

**Excel Import Support:**
- Excel files can include a "Recipient Email" column
- The column header must be exactly "Recipient Email"
- This field is optional in Excel - if not provided, users can fill it manually
- Both paste and file upload methods support this field

### 3. Issue Certificates Button

- **Appearance**: Green button with a verified icon
- **Text**: "Issue Certificates" (instead of "Bulk Export PDF (ZIP)")
- **Function**: Creates certificate records in the database and generates PDF files
- **PDF Generation**: Automatically generates PDF certificates and stores them in Supabase Storage
- **Non-organization users**: Button is visible but disabled with tooltip indicating organization requirement

### 4. Validation

Before issuing certificates:
- All fields must be filled (no empty values)
- Recipient email must be valid
- Template must be selected

### 5. Duplicate Detection

The system automatically detects duplicate certificates based on:
- Template ID
- Publisher ID
- Recipient Email
- Metadata Values

### 6. Duplicate Handling

When duplicates are detected:
- A dialog shows the list of duplicate certificates
- Users can choose to:
  - **Update Duplicates**: Replace existing certificates with new data
  - **Skip Duplicates**: Keep existing certificates unchanged
  - **Cancel**: Abort the operation

### 7. Success Messages

After successful issuance:
- Shows count of issued certificates
- Prompts users to check the "Certificates" page
- Provides feedback on duplicate handling

## Database Integration

### Certificate Storage

Certificates are stored in the `certificates` table with:
- Unique certificate keys (SHA256 hash)
- Content hashes for integrity verification
- Watermark data for offline verification
- PDF URLs linking to generated PDF files in Supabase Storage

### PDF Generation and Storage

When certificates are issued:
1. **PDF Generation**: Creates professional PDF certificates using the same template rendering as bulk export
2. **Template Rendering**: Uses CertificatePreview component with html2canvas and jsPDF for high-quality output
3. **Content**: Includes all template fields, metadata values, and proper formatting
4. **Storage**: Uploads PDFs to Supabase Storage bucket named 'certificates'
5. **Naming**: PDFs are named using the certificate key (e.g., `{certificateKey}.pdf`)
6. **Access**: PDFs are publicly accessible via the stored URL
7. **Updates**: When certificates are updated, new PDFs are generated and replace the old ones
8. **Consistency**: Generated PDFs match exactly with the template preview and bulk export format

### Certificate Verification

- Public verification page: `/verify/[certificateKey]`
- Shows certificate details and status
- Validates certificate authenticity

## User Interface

### Navigation

- **Certificates Page**: Available in navigation for verified organizations
- **URL**: `/certificates`
- **Features**: 
  - View all issued certificates
  - Check certificate status
  - Access verification links
  - Download PDFs (when available)

### Certificate Management

The Certificates page displays:
- Recipient email
- Certificate key (truncated)
- Status (active/revoked/expired)
- Issue date
- Action buttons (view/download)

## Technical Implementation

### Key Components

1. **useCertificateIssuance Hook**
   - Handles certificate creation logic
   - Manages duplicate detection
   - Provides progress tracking

2. **BulkGenerationModal**
   - Enhanced with issue mode toggle
   - Dynamic recipient email field
   - Duplicate handling dialog

3. **Certificate Verification Page**
   - Public verification endpoint
   - Certificate status display
   - Metadata visualization

### Security Features

- Row Level Security (RLS) policies
- Organization-based access control
- Certificate key uniqueness
- Content hash verification

## Usage Workflow

### For Verified Organizations

1. **Login as Verified Organization**
   - Ensure organization status is "approved"

2. **Select Template**
   - Choose a certificate template
   - Configure fields as needed

3. **Enable Issue Mode**
   - Toggle "Certificate Issue Mode" in bulk generation modal
   - Verify organization status indicator

4. **Add Recipient Data**
   - Fill in recipient email for each row
   - Complete all required fields

5. **Issue Certificates**
   - Click "Issue Certificates" button
   - Handle any duplicate warnings
   - Review success message

6. **Manage Certificates**
   - Navigate to "Certificates" page
   - View issued certificates
   - Access verification links

### For Non-Organization Users

1. **View Feature Preview**
   - Certificate Issue Mode toggle is visible but disabled
   - Shows "Organization Required" status
   - Displays call-to-action message

2. **Understand Benefits**
   - See the enhanced functionality available to organizations
   - Understand the value proposition

3. **Register as Organization**
   - Follow the call-to-action to register as an organization
   - Complete the verification process
   - Unlock the full certificate issuance capabilities

## Error Handling

### Common Issues

1. **Organization Not Verified**
   - Issue mode toggle is visible but disabled
   - Shows "Organization Required" status
   - Register as organization to enable

2. **Empty Fields**
   - Validation prevents issuance (for verified organizations)
   - Fill all required fields

3. **Invalid Email**
   - Email validation errors (for verified organizations)
   - Correct email format

4. **Duplicate Certificates**
   - Warning dialog appears
   - Choose update or skip option

### Error Messages

- Clear feedback on validation failures
- Specific duplicate certificate details
- Success confirmation with counts

## Future Enhancements

### Planned Features

1. **Enhanced PDF Templates**
   - Customizable PDF layouts
   - Advanced styling options
   - Multiple template formats

2. **Digital Watermarking**
   - Offline verification support
   - PDF integrity verification
   - Invisible watermarks for security

3. **Certificate Revocation**
   - Ability to revoke certificates
   - Status management
   - Revocation list management

4. **Bulk Operations**
   - Bulk certificate updates
   - Mass status changes
   - Batch PDF regeneration

5. **Advanced Features**
   - Certificate expiration management
   - Email notifications
   - Certificate analytics
   - PDF customization options

## Database Schema

### Certificates Table

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES templates(id),
  publisher_id UUID REFERENCES organizations(id),
  recipient_email VARCHAR(255) NOT NULL,
  metadata_values JSONB NOT NULL,
  content_hash VARCHAR(255) NOT NULL,
  certificate_key VARCHAR(255) UNIQUE NOT NULL,
  watermark_data JSONB NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Constraints

- Unique constraint on (template_id, publisher_id, recipient_email, metadata_values)
- Certificate key uniqueness
- Foreign key relationships

## Security Considerations

1. **Access Control**
   - Only verified organizations can issue certificates
   - RLS policies enforce data access

2. **Data Integrity**
   - Content hashes prevent tampering
   - Certificate keys ensure uniqueness

3. **Public Verification**
   - Read-only access to certificate data
   - No sensitive information exposure

## User Acquisition Strategy

### Feature Visibility for Non-Organizations

The Certificate Issue Mode feature is strategically designed to be visible to all users, even those who are not registered organizations. This serves as a powerful user acquisition tool:

1. **Feature Preview**
   - Non-organization users can see the enhanced functionality
   - Disabled state clearly indicates what's available to organizations
   - Creates desire to upgrade and access premium features

2. **Call-to-Action Messaging**
   - Clear messaging: "Register as an organization to unlock this powerful feature!"
   - Highlights the value proposition
   - Encourages conversion to organization accounts

3. **Visual Indicators**
   - Disabled toggle switch with organization requirement notice
   - Grayed-out fields with helpful placeholder text
   - Professional appearance maintains platform credibility

4. **Conversion Funnel**
   - Awareness: Users see the feature exists
   - Interest: Users understand the benefits
   - Desire: Users want to access the functionality
   - Action: Users register as organizations

### Benefits for Platform Growth

- **Increased Organization Registrations**: More users convert to organization accounts
- **Feature Discovery**: Users learn about advanced capabilities
- **Value Demonstration**: Shows the platform's professional features
- **User Engagement**: Encourages exploration of premium features

## Excel Format Requirements

### Required Columns
The Excel file must contain headers that exactly match your certificate field labels. For example:
- Name
- Date  
- Certificate ID
- (Any other fields defined in your template)

### Optional Columns
- **Recipient Email**: Include this column for certificate issuance mode
  - Header must be exactly "Recipient Email"
  - If not provided in Excel, you can fill it manually in the interface
  - Supports both paste and file upload methods

### Example Excel Format
```
Name    Date        Certificate ID    Recipient Email
Victor    2024-01-15  CERT001           victor@example.com
Zephyr    2024-01-16  CERT002           zephyr@example.com
```

### Import Methods
1. **Paste Excel Data**: Copy from Excel and paste into the designated area
2. **Upload Excel File**: Select .xlsx, .xls, or .csv files
3. **Manual Entry**: Add rows and fill in data manually

### Validation Rules
- All required fields must be present in the Excel header
- "Recipient Email" is optional but recommended for certificate issuance
- Data rows must contain values for all required fields
- Empty rows are automatically filtered out

## Support

For issues or questions:
1. Check organization verification status
2. Verify all required fields are filled
3. Review error messages for specific guidance
4. Contact system administrator for technical support 