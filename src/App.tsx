/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { CourseDetail } from './pages/CourseDetail';
import { InstructorDashboard } from './pages/InstructorDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { CoursePlayer } from './pages/CoursePlayer';
import { CurriculumManager } from './pages/CurriculumManager';
import { AuthProvider } from './context/AuthContext';

import { Success } from './pages/Success';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen relative overflow-x-hidden">
          <div className="fixed inset-0 mesh-bg z-0 pointer-events-none" />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="container mx-auto px-4 py-8 flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/course/:id" element={<CourseDetail />} />
                <Route path="/dashboard/instructor" element={<InstructorDashboard />} />
                <Route path="/instructor/course/:courseId/curriculum" element={<CurriculumManager />} />
                <Route path="/dashboard/student" element={<StudentDashboard />} />
                <Route path="/player/:courseId" element={<CoursePlayer />} />
                <Route path="/player/:courseId/:lessonId" element={<CoursePlayer />} />
                <Route path="/success" element={<Success />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}
