import { fireEvent, render, screen } from "@testing-library/react";
import Menu from "./Menu";

jest.mock("./EditProfile", () => () => <div>Mock Edit Profile</div>);
jest.mock("./installPrompt", () => ({
  clearInstallPromptEvent: jest.fn(),
  getInstallPromptState: () => ({
    promptEvent: null,
    isInstalled: false,
  }),
  subscribeInstallPrompt: () => () => {},
}));

const baseUser = {
  uid: "user-1",
  name: "Yuda",
  email: "yuda@example.com",
  photo: "https://example.com/photo.jpg",
  isOwner: true,
  groupId: "GROUP-TEST-123",
};

test("shows manual install helper when prompt event is not available", () => {
  render(<Menu user={baseUser} onNavigate={jest.fn()} onLogout={jest.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: /lihat cara install/i }));

  expect(screen.getByText(/cara pasang aplikasi/i)).toBeInTheDocument();
  expect(
    screen.getByText(/browser ini belum mengirim pop-up install otomatis/i)
  ).toBeInTheDocument();
});

test("shows qr generator menu for owner", () => {
  render(<Menu user={baseUser} onNavigate={jest.fn()} onLogout={jest.fn()} />);

  expect(screen.getByText(/generate qr/i)).toBeInTheDocument();
});
