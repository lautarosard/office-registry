import { Outlet } from 'react-router-dom';

/** Centered card used by the login and change-password screens. */
export const PublicLayout = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <main className="w-full max-w-md overflow-hidden rounded-lg bg-gray-100 shadow-lg">
        <div className="border-b-4 border-gold bg-linear-to-b from-navy-800 to-navy-900 px-6 py-5 text-center">
          <p className="text-sm font-semibold tracking-widest text-white uppercase">
            Policía Federal Argentina
          </p>
          <p className="mt-1 text-sm text-gray-200">Registro de Expedientes</p>
        </div>
        <div className="px-6 py-8 sm:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
