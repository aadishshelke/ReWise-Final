import React from 'react';

const LoadingSpinner = ({ message = "Loading..." }) => (
    <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">{message}</p>
    </div>
);

export default LoadingSpinner;