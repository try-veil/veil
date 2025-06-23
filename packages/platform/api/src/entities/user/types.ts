export enum UserType {
  User = 'User',
  Organization = 'Organization',
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  slugifiedName: string;
  type: UserType;
  description: string | null;
  bio: string | null;
  thumbnail: string | null;
}

export interface UserAttribute {
  id: string;
  userId: string;
  attributeName: string;
  attributeValue: string;
}

export interface UserMetadata {
  id: string;
  userId: string;
  attributeName: string;
  attributeValue: string;
}

export interface UserAuthorization {
  id: string;
  key: string;
  name: string;
  applicationId: string;
  status: string;
  authorizationType: string;
  grantType: string | null;
  authorizationValues: any | null;
  createdAt: Date;
  updatedAt: Date;
}
