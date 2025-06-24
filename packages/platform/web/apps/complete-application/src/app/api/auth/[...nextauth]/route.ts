import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      accessToken?: string;
      refreshToken?: string;
    }
  }
}

// Define the shape of the response from your login API
type LoginResponse = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
};

// Define the shape of your token
interface ExtendedToken extends JWT {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  error?: string;
}

// Define the shape of your session
interface ExtendedSession extends Session {
  accessToken: string;
  error?: string;
  user: {
    id: string;
    name: string;
    email: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "custom-credentials",
      name: "Custom Provider",
      credentials: {
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
        userData: { label: "User Data", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        try {
          const userData =
            typeof credentials.userData === "string"
              ? JSON.parse(credentials.userData)
              : credentials.userData;

          return {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
          };
        } catch (error) {
          console.error("Error in custom authorize callback:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }): Promise<ExtendedToken> {
      // First time sign in
      if (user) {
        return {
          ...token,
          accessToken: (user as any).accessToken,
          refreshToken: (user as any).refreshToken,
          accessTokenExpiry: Date.now() +  15 * 60 * 1000,
          user: {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
          },
        };
      }

      // If token is still valid, return it
      if (Date.now() < (token.accessTokenExpiry as number)) {
        console.log("Token still valid until:", new Date(token.accessTokenExpiry as number));
        return token as ExtendedToken;
      }
      console.log("Token expired, refreshing...");
      // Refresh the token
      try {
        const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL!;
        const tenantId = process.env.FUSIONAUTH_TENANT_ID!;

        const response = await fetch(`${fusionAuthUrl}/api/jwt/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-FusionAuth-TenantId": tenantId
          },
          body: JSON.stringify({
            refreshToken: token.refreshToken,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Token refresh failed:", errorData.error);
          return { ...token, error: "RefreshAccessTokenError" } as ExtendedToken;
        }

        const data = await response.json();

        return {
          ...token,
          accessToken: data.token,
          refreshToken: data.refreshToken || token.refreshToken,
          accessTokenExpiry: Date.now() + 15 * 60 * 1000,
        } as ExtendedToken;
      } catch (error) {
        console.error("Token refresh exception:", error);
        return { ...token, error: "RefreshAccessTokenError" } as ExtendedToken;
      }
    },

    async session({ session, token }): Promise<Session> {
      const extendedToken = token as ExtendedToken;
      return {
        ...session,
        user: {
          ...session.user,
          id: extendedToken.user.id,
          accessToken: extendedToken.accessToken,
          refreshToken: extendedToken.refreshToken,
        },
      };
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
