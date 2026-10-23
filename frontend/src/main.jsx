import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store/store";
import { createQueryClient } from "./api/queryClient";
import { ToastProvider } from "./components/common/Toast";
import { ConfirmProvider } from "./components/common/ConfirmDialog";
import App from "./App";
import "./index.css";

const queryClient = createQueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
