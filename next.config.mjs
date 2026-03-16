import withPWAInit from "next-pwa";
import path from "path";
import { fileURLToPath } from "url";

// Bundle analyzer is optional - only used when ANALYZE=true
// It's a devDependency so may not be available in production
let withBundleAnalyzer = (config) => config;
if (process.env.ANALYZE === "true") {
  try {
    const bundleAnalyzer = (await import("@next/bundle-analyzer")).default;
    withBundleAnalyzer = bundleAnalyzer({ enabled: true });
  } catch (e) {
    console.warn("Bundle analyzer not available, skipping...");
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  // COMPLETELY DISABLE PWA IN DEV MODE to prevent "bad-precaching-response" errors
  disable: process.env.NODE_ENV === "development",
  // Exclude build manifests from precaching to avoid 404 errors
  buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/, /_buildManifest\.js$/],
  reloadOnOnline: false,
  // Fallback for offline pages
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-audio-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-style-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-data",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\/api\/mobile\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "mobile-api",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment (auto-detect)
  ...(process.env.DOCKER === "true" ? { output: "standalone" } : {}),

  // Disable font optimization during Docker builds (no internet access to Google Fonts)
  optimizeFonts: process.env.DOCKER !== "true",

  // Server-side packages that should not be bundled by webpack
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-toast',
      '@radix-ui/react-popover',
      'sonner',
    ],
  },

  // Production optimizations
  poweredByHeader: false,

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Security headers - HARDENED
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Content Security Policy - STRENGTHENED
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: Next.js requires unsafe-inline for hydration
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              // Styles: Next.js/Tailwind requires unsafe-inline
              "style-src 'self' 'unsafe-inline'",
              // Images: self, data URIs, HTTPS
              "img-src 'self' data: blob: https:",
              // Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Connect: API endpoints + dev HMR websocket
              `connect-src 'self' https://api.anthropic.com wss: ${process.env.NODE_ENV === 'development' ? 'ws:' : ''}`,
              // Frame ancestors: prevent clickjacking
              "frame-ancestors 'none'",
              // Form action
              "form-action 'self'",
              // Base URI
              "base-uri 'self'",
              // Object source: none (disable plugins)
              "object-src 'none'",
              // Media
              "media-src 'self'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
            ].filter(Boolean).join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: [
              "camera=(self)",
              "microphone=()",
              "geolocation=()",
              "interest-cohort=()", // Disable FLoC
              "accelerometer=()",
              "gyroscope=()",
              "magnetometer=()",
              "payment=()",
              "usb=()",
            ].join(", "),
          },
          // Cross-Origin Policies
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-site",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
              {
                key: "Strict-Transport-Security",
                value: "max-age=31536000; includeSubDomains; preload",
              },
            ]
            : []),
        ],
      },
      // API routes - additional security
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },

  // Redirect trailing slashes
  trailingSlash: false,

  // Enable React strict mode
  reactStrictMode: true,

  // Image optimization
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV === "development",
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for some npm packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Ensure path alias works correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    return config;
  },
};

export default withBundleAnalyzer(withPWA(nextConfig));
