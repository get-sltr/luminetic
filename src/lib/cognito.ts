import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

function getClientId() {
  const id = process.env.COGNITO_CLIENT_ID;
  if (!id) throw new Error("COGNITO_CLIENT_ID is not set");
  return id;
}

export async function signUp(email: string, password: string) {
  const command = new SignUpCommand({
    ClientId: getClientId(),
    Username: email,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });
  return cognitoClient.send(command);
}

export async function confirmSignUp(email: string, code: string) {
  const command = new ConfirmSignUpCommand({
    ClientId: getClientId(),
    Username: email,
    ConfirmationCode: code,
  });
  return cognitoClient.send(command);
}

export async function signIn(email: string, password: string) {
  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: getClientId(),
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });
  return cognitoClient.send(command);
}

export async function getUser(accessToken: string) {
  const command = new GetUserCommand({ AccessToken: accessToken });
  return cognitoClient.send(command);
}

export async function signOut(accessToken: string) {
  const command = new GlobalSignOutCommand({ AccessToken: accessToken });
  return cognitoClient.send(command);
}

export async function refreshSession(refreshToken: string) {
  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    ClientId: getClientId(),
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  });
  return cognitoClient.send(command);
}

export async function forgotPassword(email: string) {
  const command = new ForgotPasswordCommand({
    ClientId: getClientId(),
    Username: email,
  });
  return cognitoClient.send(command);
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string) {
  const command = new ConfirmForgotPasswordCommand({
    ClientId: getClientId(),
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
  return cognitoClient.send(command);
}
