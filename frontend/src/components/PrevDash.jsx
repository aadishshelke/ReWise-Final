import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';// We will create this custom hook in App.jsx
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const PrevDash = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const getLinkClass = ({ isActive }) =>
        `inline-block p-4 rounded-t-lg border-b-2 text-sm md:text-base ${
            isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300'
        }`;

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-md">
                <nav className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
                    <h1 className="text-lg md:text-xl font-bold text-blue-600">ReWise Sahayak</h1>
                    <div>
                        <span className="text-gray-700 mr-2 md:mr-4 text-sm hidden md:inline">
                            {user?.email}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </nav>
            </header>

            <main className="container mx-auto p-4 md:p-6">
                <div className="mb-6 border-b border-gray-200">
                    <ul className="flex flex-wrap -mb-px font-medium text-center">
                        <li className="mr-2">
                            <NavLink to="/" className={getLinkClass}>Worksheets</NavLink>
                        </li>
                        <li className="mr-2">
                            <NavLink to="/story" className={getLinkClass}>Story Generator</NavLink>
                        </li>
                        <li className="mr-2">
                            <NavLink to="/concept" className={getLinkClass}>Concept Explainer</NavLink>
                        </li>
                         <li className="mr-2">
                            <NavLink to="/chalkboard" className={getLinkClass}>Chalkboard View</NavLink>
                        </li>
                    </ul>
                </div>

                {/* Child routes will be rendered here */}
                <Outlet context={{ user }} />
            </main>
        </div>
    );
};

export default PrevDash;