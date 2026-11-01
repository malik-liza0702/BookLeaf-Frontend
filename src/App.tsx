import { Route, Routes } from 'react-router-dom';
import { HomeRedirect, RequireRole } from '@/auth/RequireRole';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/features/auth/LoginPage';
import { AuthorDashboardPage } from '@/features/author/dashboard/AuthorDashboardPage';
import { MyBooksPage } from '@/features/author/books/MyBooksPage';
import { MyTicketsPage } from '@/features/author/tickets/MyTicketsPage';
import { NewTicketPage } from '@/features/author/tickets/NewTicketPage';
import { AuthorTicketDetailPage } from '@/features/author/tickets/AuthorTicketDetailPage';
import { AuthorDetailPage } from '@/features/admin/authors/AuthorDetailPage';
import { AuthorsPage } from '@/features/admin/authors/AuthorsPage';
import { TicketQueuePage } from '@/features/admin/queue/TicketQueuePage';
import { AdminTicketDetailPage } from '@/features/admin/ticket/AdminTicketDetailPage';
import { NotFoundPage } from '@/features/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<RequireRole role="author" />}>
        <Route element={<Layout />}>
          <Route path="/author" element={<HomeRedirect />} />
          <Route path="/author/dashboard" element={<AuthorDashboardPage />} />
          <Route path="/author/books" element={<MyBooksPage />} />
          <Route path="/author/tickets" element={<MyTicketsPage />} />
          <Route path="/author/tickets/new" element={<NewTicketPage />} />
          <Route path="/author/tickets/:ticketId" element={<AuthorTicketDetailPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<HomeRedirect />} />
          <Route path="/admin/tickets" element={<TicketQueuePage />} />
          <Route path="/admin/tickets/:ticketId" element={<AdminTicketDetailPage />} />
          <Route path="/admin/authors" element={<AuthorsPage />} />
          <Route path="/admin/authors/:authorId" element={<AuthorDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
