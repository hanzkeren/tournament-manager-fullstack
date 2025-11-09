flowchart TD
    A[User navigates to Sign-In] --> B[Display Sign-In Form]
    B --> C[Submit credentials to Express auth login endpoint]
    C --> D{Credentials valid}
    D -->|Yes| E[Receive JWT token]
    E --> F[Store JWT in local storage]
    F --> G[Redirect to Dashboard]
    D -->|No| H[Display sign-in error]
    G --> I[Dashboard page loads]
    I --> J[Fetch protected resources using JWT]
    J --> K{Response OK}
    K -->|Yes| L[Display dashboard data]
    K -->|No| M[Handle API error]
    X[User navigates to Sign-Up] --> Y[Display Sign-Up Form]
    Y --> Z[Submit registration to Express auth signup endpoint]
    Z --> AA{Registration successful}
    AA -->|Yes| AB[Receive JWT token]
    AB --> AC[Store JWT and redirect to Dashboard]
    AA -->|No| AD[Display sign-up error]