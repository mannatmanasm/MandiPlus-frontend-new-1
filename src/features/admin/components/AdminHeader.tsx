'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { useAdmin } from '../context/AdminContext';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function AdminHeader() {
    const { logout } = useAdmin();

    return (
        <header className="bg-white shadow">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                <div className="flex items-center">
                    <button
                        type="button"
                        className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                        <span className="sr-only">View notifications</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Profile dropdown */}
                    <Menu as="div" className="relative ml-3">
                        <div>
                            <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                                <span className="sr-only">Open user menu</span>
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <span className="text-green-600 font-medium">A</span>
                                </div>
                            </Menu.Button>
                        </div>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={logout}
                                            className={classNames(
                                                active ? 'bg-gray-100' : '',
                                                'block w-full px-4 py-2 text-left text-sm text-gray-700'
                                            )}
                                        >
                                            Sign out
                                        </button>
                                    )}
                                </Menu.Item>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>
        </header>
    );
}
