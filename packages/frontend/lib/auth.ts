import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.githubUsername = (profile as any).login;
        token.avatarUrl = (profile as any).avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubUsername = token.githubUsername;
        (session.user as any).avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
  pages: {
    signIn: '/profile',
  },
};
