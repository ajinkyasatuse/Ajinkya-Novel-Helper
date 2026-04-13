
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Auth from './components/Auth';
import DashboardLayout from './layouts/DashboardLayout';
import ProjectLayout from './layouts/ProjectLayout';
import BetaReaderView from './components/BetaReaderView';
import { LoaderIcon } from './components/Icons';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './services/firebase';
import { signInAnonymously } from 'firebase/auth';
import ErrorBoundary from './ErrorBoundary';

// Lazy Load Pages
const EditorPage = React.lazy(() => import('./pages/EditorPage'));
const CorkboardPage = React.lazy(() => import('./pages/CorkboardPage'));
const TimelinePage = React.lazy(() => import('./pages/TimelinePage'));
const BinPage = React.lazy(() => import('./pages/BinPage'));

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading } = useAuth();
    if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-primary"><LoaderIcon /></div>;
    return currentUser ? <>{children}</> : <Auth />;
};

// Helper wrapper to fetch data for Beta Reader
const BetaReaderViewWrapper = ({ shareId }: { shareId?: string }) => {
    const [novel, setNovel] = React.useState<any>(null);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!shareId) return;
        const fetch = async () => {
            await signInAnonymously(auth);
            const snap = await getDoc(doc(db, 'shared_novels', shareId));
            if (snap.exists()) setNovel({ id: snap.id, ...snap.data() });
            else setError("Novel not found");
        };
        fetch();
    }, [shareId]);

    if (error) return <div className="h-screen flex items-center justify-center text-white">{error}</div>;
    if (!novel) return <div className="h-screen flex items-center justify-center bg-primary"><LoaderIcon /></div>;
    return <BetaReaderView novel={novel} />;
};

// Wrapper for Beta View to fetch data inside component since it has its own logic
const BetaWrapper = () => {
    const { shareId } = useParams();
    return <BetaReaderViewWrapper shareId={shareId} />;
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-primary text-text-primary"><LoaderIcon /></div>}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Auth />} />
                        
                        {/* Public Beta Reader (Isolated) */}
                        <Route path="/beta/:shareId" element={<BetaWrapper />} />

                        {/* Dashboard */}
                        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />

                        {/* Project Workspace - Wrapped in ProjectProvider */}
                        <Route path="/novel/:novelId/*" element={
                            <ProtectedRoute>
                                <ProjectProvider>
                                    <ProjectLayout />
                                </ProjectProvider>
                            </ProtectedRoute>
                        }>
                            <Route path="editor/:bookId?/:chapterId?" element={<EditorPage />} />
                            <Route path="corkboard" element={<CorkboardPage />} />
                            <Route path="timeline" element={<TimelinePage />} />
                            <Route path="bin" element={<BinPage />} />
                            {/* Default redirect to editor */}
                            <Route path="*" element={<Navigate to="editor" replace />} />
                        </Route>
                    </Routes>
                </Suspense>
            </AuthProvider>
        </ErrorBoundary>
    );
};

export default App;
