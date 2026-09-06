import { Navigate, Route, Routes } from "react-router-dom";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { TaskList } from "./pages/TaskList";
import { TaskForm } from "./pages/TaskForm";
import { RequireAuth } from "./components/RequireAuth";

export function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/tasks"
        element={
          <RequireAuth>
            <TaskList />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <RequireAuth>
            <TaskForm />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks/:id/edit"
        element={
          <RequireAuth>
            <TaskForm />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
