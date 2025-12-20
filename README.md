# Dhanvarshagoldloan

A comprehensive Customer Relationship Management (CRM) system built with Angular 16 for managing loan applications, customer details, KYC documents, and valuations.

## 🚀 Features

- **Loan Application Management**: Complete wizard-based loan application process
- **Customer Management**: Personal details, family details, work details, and more
- **KYC Document Management**: Upload and manage Aadhaar, PAN, and other KYC documents
- **Valuation System**: First, second, and final valuation tracking
- **Dashboard**: Analytics and charts using ECharts
- **Authentication**: Secure login with JWT token-based authentication
- **Document Upload**: Photo and document upload functionality with webcam support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher recommended)
- **npm** (v9.x or higher) or **yarn**
- **Angular CLI** (v16.2.16)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dhanvarshagoldloan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Update `src/app/environment.ts` with your development API URL:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'https://your-dev-api-url.com'
   };
   ```

   For production, update `src/app/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-production-api-url.com'
   };
   ```

## 🏃 Running the Application

### Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Production Build

```bash
npm run build:prod
# or
ng build --configuration production
```

The build artifacts will be stored in the `dist/dhanvarshagoldloan/` directory.

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/              # Authentication guards, interceptors, and services
│   ├── layout/            # Main layout components
│   │   ├── dashboard/     # Dashboard component
│   │   ├── header/        # Header component
│   │   ├── sidebar/       # Sidebar navigation
│   │   ├── loan-application-wizard/  # Multi-step loan application wizard
│   │   │   └── steps/     # Individual wizard steps
│   │   └── worklist/      # Worklist component
│   ├── login/             # Login component
│   ├── pages/             # Additional page components
│   ├── services/          # Angular services
│   │   ├── PersonalDetailsService.ts
│   │   └── toast.service.ts
│   ├── environment.ts     # Development environment config
│   ├── environment.prod.ts # Production environment config
│   └── app.module.ts      # Root module
├── assets/                # Static assets (images, etc.)
└── styles.css             # Global styles
```

## 🧪 Testing

### Run Unit Tests

```bash
npm test
# or
ng test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

## 🎨 Code Formatting

### Format Code

```bash
npm run format
```

### Check Formatting

```bash
npm run format:check
```

## 📦 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for development
- `npm run build:prod` - Build for production
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🏗️ Technology Stack

- **Angular** 16.2.0
- **Angular Material** 16.2.14
- **RxJS** 7.8.0
- **ECharts** 5.6.0 (via ngx-echarts)
- **ngx-webcam** 0.4.1
- **TypeScript** 5.1.3

## 🔐 Authentication

The application uses JWT token-based authentication. The `AuthInterceptor` automatically adds the authentication token to all HTTP requests.

## 📝 Key Components

### Loan Application Wizard

Multi-step wizard for creating loan applications:
- Personal Details
- Family Details
- Address & Activity
- Work Details
- KYC Details
- Nominee Details
- Reference Details
- Gold Ownership Details
- First Valuation
- Second Valuation
- Final Valuation
- Additional Documents

### Services

- **PersonalDetailsService**: Handles all customer-related API calls
- **ToastService**: Provides toast notifications for user feedback

## 🌐 API Configuration

The application communicates with a backend API. Configure the API URL in the environment files:

- Development: `src/app/environment.ts`
- Production: `src/app/environment.prod.ts`

## 🤝 Contributing

1. Follow the Angular style guide
2. Use Prettier for code formatting
3. Write unit tests for new features
4. Follow the existing code structure and naming conventions

## 📄 License

This project is private and proprietary.

## 🆘 Support

For Angular CLI help, use `ng help` or check the [Angular CLI documentation](https://angular.io/cli).

---

**Note**: Make sure to update the API URLs in the environment files before running the application.
