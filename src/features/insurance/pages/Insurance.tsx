'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import 'cropperjs/dist/cropper.css';
import {
    ArrowUpIcon,
    PaperClipIcon,
    PencilSquareIcon,
    CheckIcon,
    XMarkIcon,
    TrashIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import Cropper, { ReactCropperElement } from 'react-cropper';

import { createInsuranceForm } from '../api';

// --- Types ---
interface FormData {
    supplierName: string;
    supplierAddress: string;
    placeOfSupply: string;
    buyerName: string;
    buyerAddress: string;
    itemName: string;
    hsn: string;
    quantity: string | number;
    rate: string | number;
    vehicleNumber: string;
    ownerName: string;
    cashOrCommission: string;
    invoiceType: string;
    notes: string;
}

interface QuestionText {
    en: string;
    hi: string;
}

interface Question {
    field: keyof FormData | 'language' | 'weightmentSlip';
    type: 'text' | 'number' | 'language' | 'file' | 'select' | 'address';
    text: QuestionText;
    optional?: boolean;
    step?: string;
    options?: string[];
}

interface Message {
    text: string;
    sender: 'bot' | 'user';
    field?: keyof FormData | 'language' | 'weightmentSlip';
}

// 1. UPDATE INTERFACE to catch Pin Code
interface OSMPlace {
    display_name: string;
    lat: string;
    lon: string;
    address?: {
        postcode?: string;
        road?: string;
        city?: string;
        state?: string;
        country?: string;
    };
}

// --- Data ---
const itemsData = [
    { name: "Tender Coconut", hsn: "08011910" },
    { name: "Kiwi", hsn: "08109020" },
    { name: "Mango", hsn: "08045020" },
    { name: "Papaya (Papita)", hsn: "08072000" },
    { name: "Pomegranate (Anar)", hsn: "08109010" },
    { name: "Oranges", hsn: "08051000" },
    { name: "Kinnow", hsn: "08052100" },
    { name: "Guava (Amrood)", hsn: "08045030" },
    { name: "Muskmelon (Kastoori Tarbooj)", hsn: "08071910" },
    { name: "Watermelon (Tarbooj)", hsn: "08071100" },
    { name: "Tomato", hsn: "07020000" },
    { name: "Onion", hsn: "07031010" },
    { name: "Potato", hsn: "07019000" },
    { name: "Ginger (Fresh)", hsn: "07030010" },
    { name: "Sweet Potato", hsn: "07142000" },
];

// --- Constants ---
const questions: Question[] = [
    {
        field: 'language',
        type: 'language',
        text: {
            en: "Bhasha / Language\nType 1 - English\nType 2 - Hindi",
            hi: "भाषा चुनें \nType 1 - English\nType 2 - Hindi"
        }
    },
    { field: 'supplierName', type: 'text', text: { en: "Supplier Kaun", hi: "माल भेजने वाला" } },
    { field: 'supplierAddress', type: 'address', text: { en: "Place of Supply/Supply kahan se", hi: "भेजने वाले का पता" } },
    { field: 'buyerName', type: 'text', text: { en: "Party Ka Naam", hi: "पार्टी का नाम" } },
    { field: 'buyerAddress', type: 'address', text: { en: "Party Address", hi: "पार्टी का पता" } },
    {
        field: 'itemName',
        type: 'select',
        options: itemsData.map(item => item.name),
        text: { en: "Select Item", hi: "आइटम चुनें" }
    },
    { field: 'quantity', type: 'number', step: "0.01", text: { en: "Kitna Maal", hi: "कुल मात्रा/QTY" } },
    { field: 'rate', type: 'number', step: "0.01", text: { en: "Kya Bhaav Lgaya", hi: "रेट/भाव" } },
    { field: 'vehicleNumber', type: 'text', text: { en: "Gaadi No.", hi: "गाड़ी नंबर" } },
    { field: 'ownerName', type: 'text', text: { en: "Transporter Ka Naam", hi: "ट्रांसपोर्टर का नाम" } },
    {
        field: 'notes',
        type: 'select',
        options: ['Cash', 'Commission'],
        optional: true,
        text: { en: "Cash ya Commission", hi: "नकद या कमीशन" }
    },
    {
        field: 'invoiceType',
        type: 'select',
        options: ['SUPPLIER_INVOICE', 'BUYER_INVOICE'],
        optional: true,
        text: { en: "Invoice Type", hi: "इनवॉइस का प्रकार" }
    },
    { field: 'weightmentSlip', type: 'file', optional: true, text: { en: "Kanta Parchi Photo", hi: "कांटा पर्ची" } },
];

const Insurance = () => {
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<FormData>({
        supplierName: '',
        supplierAddress: '',
        placeOfSupply: '',
        buyerName: '',
        buyerAddress: '',
        itemName: '',
        hsn: '',
        quantity: '',
        rate: '',
        vehicleNumber: '',
        ownerName: '',
        cashOrCommission: '',
        notes: '',
        invoiceType: 'BUYER_INVOICE',
    });

    const [weightmentSlip, setWeightmentSlip] = useState<File | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [inputValue, setInputValue] = useState<string>('');
    const [language, setLanguage] = useState<'en' | 'hi' | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        { text: questions[0].text.en, sender: 'bot' },
    ]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [viewportHeight, setViewportHeight] = useState<string>('100vh');
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [resumeQuestionIndex, setResumeQuestionIndex] = useState<number | null>(null);

    // --- Cropper State ---
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const cropperRef = useRef<ReactCropperElement>(null);
    const [isCropperReady, setIsCropperReady] = useState(false);

    // --- OpenStreetMap State ---
    const [suggestions, setSuggestions] = useState<OSMPlace[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const updateHeight = () => {
            const height = window.visualViewport?.height || window.innerHeight;
            setViewportHeight(`${height}px`);
        };
        updateHeight();
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateHeight);
            return () => window.visualViewport?.removeEventListener('resize', updateHeight);
        } else {
            window.addEventListener('resize', updateHeight);
            return () => window.removeEventListener('resize', updateHeight);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentQuestionIndex]);

    const fetchAddressSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            // NOTE: 'addressdetails=1' is critical here to get the Pin Code
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`
            );
            const data = await response.json();
            setSuggestions(data);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Error fetching address:", error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const currentQ = questions[currentQuestionIndex];
            if ((currentQ?.type === 'address' || editingMessageIndex !== null) && inputValue) {
                const field = currentQ?.field;
                const isAddressField = field === 'supplierAddress' || field === 'buyerAddress';

                if (editingMessageIndex !== null) {
                    const msg = messages[editingMessageIndex];
                    if (msg.field === 'supplierAddress' || msg.field === 'buyerAddress') {
                        fetchAddressSuggestions(inputValue);
                    }
                } else if (isAddressField) {
                    fetchAddressSuggestions(inputValue);
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [inputValue, currentQuestionIndex, editingMessageIndex, messages]);

    // 2. UPDATED HANDLER to force Pin Code inclusion
    const handleAddressSelect = (place: OSMPlace) => {
        let finalAddress = place.display_name;

        // Check if OSM provided a specific postcode in the address details
        if (place.address && place.address.postcode) {
            const pin = place.address.postcode;
            // Only add it if it's not already visible in the main string
            if (!finalAddress.includes(pin)) {
                finalAddress = `${finalAddress} - ${pin}`;
            }
        }

        setInputValue(finalAddress);
        setSuggestions([]);
        setShowSuggestions(false);
        textInputRef.current?.focus();
    };

    const submitInsuranceForm = async (fileArgument: File | null = null) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setMessages(prev => [...prev, { text: 'Submitting details...', sender: 'bot' }]);

        try {
            const submitData = new FormData();
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    if (user.id) submitData.append('userId', user.id);
                } catch (e) { console.error(e); }
            }

            submitData.append('invoiceDate', new Date().toISOString());
            submitData.append('placeOfSupply', formData.supplierAddress || 'State');
            const supAddr = formData.supplierAddress || 'Unknown Address';
            submitData.append('supplierAddress[]', supAddr);
            const buyAddr = formData.buyerAddress || 'Unknown Address';
            submitData.append('billToAddress[]', buyAddr);
            submitData.append('shipToAddress[]', buyAddr);

            const prodName = formData.itemName || 'Item';
            submitData.append('productName', prodName);
            submitData.append('supplierName', formData.supplierName || 'Unknown Supplier');
            submitData.append('billToName', formData.buyerName || 'Unknown Buyer');
            submitData.append('shipToName', formData.buyerName || 'Unknown Buyer');

            const qty = formData.quantity ? Number(formData.quantity) : 0;
            const rate = formData.rate ? Number(formData.rate) : 0;
            const amount = qty * rate;

            submitData.append('quantity', String(qty));
            submitData.append('rate', String(rate));
            submitData.append('amount', String(amount));

            if (formData.vehicleNumber) {
                submitData.append('vehicleNumber', formData.vehicleNumber);
                submitData.append('truckNumber', formData.vehicleNumber);
            }
            submitData.append('ownerName', formData.ownerName || 'Unknown Owner');
            submitData.append('invoiceType', formData.invoiceType || 'BUYER_INVOICE');
            if (formData.hsn) submitData.append('hsnCode', formData.hsn);
            if (formData.notes) submitData.append('weighmentSlipNote', formData.notes);

            const finalFile = fileArgument || weightmentSlip;
            if (finalFile) {
                submitData.append('weighmentSlips', finalFile);
            }

            const invoice = await createInsuranceForm(submitData);
            const rawPdfUrl = invoice.pdfUrl || invoice.pdfURL;

            setMessages(prev => [...prev, { text: 'Success! Invoice created.', sender: 'bot' }]);

            if (rawPdfUrl) {
                const finalLink = rawPdfUrl.startsWith('http') ? rawPdfUrl : `http://localhost:3000${rawPdfUrl}`;
                window.location.href = finalLink;
            } else {
                setMessages(prev => [...prev, { text: 'PDF is generating... Redirecting to My Forms.', sender: 'bot' }]);
                setTimeout(() => router.push("/home"), 2000);
            }

        } catch (err: any) {
            console.error(err);
            let errorMsg = 'Submission failed.';
            if (err.message) errorMsg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
            setMessages(prev => [...prev, { text: errorMsg, sender: 'bot' }]);
            setIsSubmitting(false);
        }
    };

    const handleEdit = (fieldToEdit: string) => {
        const questionIndex = questions.findIndex(q => q.field === fieldToEdit);
        const messageIndex = messages.findIndex(m => m.field === fieldToEdit);
        if (questionIndex === -1 || messageIndex === -1) return;

        if (editingMessageIndex === null) {
            setResumeQuestionIndex(currentQuestionIndex);
        }

        setEditingMessageIndex(messageIndex);
        setCurrentQuestionIndex(questionIndex);

        if (fieldToEdit === 'weightmentSlip') {
            setWeightmentSlip(null);
        }

        if (fieldToEdit === 'language') {
            setInputValue(language === 'en' ? '1' : '2');
        } else if (fieldToEdit !== 'weightmentSlip') {
            const val = formData[fieldToEdit as keyof FormData];
            setInputValue(val ? String(val) : '');
        }

        setTimeout(() => textInputRef.current?.focus(), 100);
    };

    const getQuestionText = (question: Question) => {
        return language ? question.text[language] : question.text.en;
    };

    const goToNextQuestion = () => {
        const currentQuestion = questions[currentQuestionIndex];
        let nextIndex = currentQuestionIndex + 1;

        if (nextIndex < questions.length) {
            setCurrentQuestionIndex(nextIndex);
            const nextQuestion = questions[nextIndex];
            setMessages(prev => [...prev, { text: getQuestionText(nextQuestion), sender: 'bot' }]);

            if (nextQuestion.type === 'file') {
                setTimeout(() => fileInputRef.current?.click(), 300);
            }
        } else {
            submitInsuranceForm();
        }
    };

    const processInput = (value: string) => {
        const q = questions[currentQuestionIndex];
        const currentInput = value.trim();

        setShowSuggestions(false);
        setSuggestions([]);

        if (q.field === 'language') {
            if (currentInput !== '1' && currentInput !== '2') {
                setError('Please type 1 or 2 / कृपया 1 या 2 टाइप करें');
                return;
            }
        }
        if (!q.optional && !currentInput) {
            setError(language === 'hi' ? 'यह फ़ील्ड आवश्यक है' : 'This field is required');
            return;
        }
        setError('');

        const isFormField = (field: keyof FormData | 'language' | 'weightmentSlip'): field is keyof FormData => {
            return field !== 'language' && field !== 'weightmentSlip';
        };

        if (q.field === 'language') {
            const selectedLanguage = currentInput === '1' ? 'en' : 'hi';
            setLanguage(selectedLanguage);
            if (editingMessageIndex !== null) {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[editingMessageIndex] = { ...newMsgs[editingMessageIndex], text: selectedLanguage === 'en' ? 'English' : 'हिंदी' };
                    return newMsgs;
                });
                setEditingMessageIndex(null);
                if (resumeQuestionIndex !== null) setCurrentQuestionIndex(resumeQuestionIndex);
                setResumeQuestionIndex(null);
                return;
            } else {
                setMessages(prev => [
                    ...prev,
                    { text: selectedLanguage === 'en' ? 'English' : 'हिंदी', sender: 'user', field: 'language' },
                    { text: questions[1].text[selectedLanguage], sender: 'bot' }
                ]);
                setInputValue('');
                setCurrentQuestionIndex(1);
                return;
            }
        }

        if (isFormField(q.field)) {
            const valueToStore = (q.type === 'number' && currentInput) ? parseFloat(currentInput) : currentInput;

            if (q.field === 'itemName') {
                const selectedItem = itemsData.find(item => item.name === currentInput);
                const hsnCode = selectedItem ? selectedItem.hsn : '';
                setFormData(prev => ({ ...prev, itemName: currentInput, hsn: hsnCode }));
            } else {
                setFormData(prev => ({ ...prev, [q.field]: valueToStore }));
            }
        }

        if (editingMessageIndex !== null) {
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[editingMessageIndex] = { ...newMsgs[editingMessageIndex], text: currentInput };
                return newMsgs;
            });
            setEditingMessageIndex(null);
            setInputValue('');
            if (resumeQuestionIndex !== null) {
                setCurrentQuestionIndex(resumeQuestionIndex);
                setResumeQuestionIndex(null);
            }
        } else {
            setMessages(prev => [...prev, { text: currentInput, sender: 'user', field: q.field }]);
            setInputValue('');
            goToNextQuestion();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processInput(inputValue);
    };

    const handleOptionSelect = (opt: string) => {
        processInput(opt);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                setIsCropping(true);
                setIsCropperReady(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsDataURL(file);
        }
    };

    const rotateImage = (degrees: number) => {
        setRotation(prev => (prev + degrees) % 360);
        if (cropperRef.current) {
            const image = cropperRef.current.cropper.getImageData();
            cropperRef.current.cropper.rotateTo(rotation + degrees);
        }
    };

    const getCroppedImage = (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const cropper = cropperRef.current?.cropper;
            if (!cropper) {
                resolve(null);
                return;
            }

            const canvas = cropper.getCroppedCanvas({
                minWidth: 300,
                minHeight: 300,
                maxWidth: 4096,
                maxHeight: 4096,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            if (!canvas) {
                resolve(null);
                return;
            }

            // Apply rotation if any
            if (rotation !== 0) {
                const rotatedCanvas = document.createElement('canvas');
                const ctx = rotatedCanvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }

                // Set canvas size to fit rotated image
                if (rotation % 180 === 0) {
                    rotatedCanvas.width = canvas.width;
                    rotatedCanvas.height = canvas.height;
                } else {
                    rotatedCanvas.width = canvas.height;
                    rotatedCanvas.height = canvas.width;
                }

                // Move to center, rotate, then draw
                ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

                // Use the rotated canvas
                rotatedCanvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/jpeg', 0.9);
            } else {
                // No rotation needed, use original canvas
                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/jpeg', 0.9);
            }
        });
    };

    const handleCropComplete = async () => {
        const blob = await getCroppedImage();
        if (!blob) return;

        const croppedFile = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
        setWeightmentSlip(croppedFile);
        setIsCropping(false);
        setRotation(0); // Reset rotation for next use

        if (editingMessageIndex !== null) {
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[editingMessageIndex] = {
                    ...newMsgs[editingMessageIndex],
                    text: `📎 ${croppedFile.name} (Edited)`
                };
                return newMsgs;
            });
            setEditingMessageIndex(null);
            if (resumeQuestionIndex !== null) {
                setCurrentQuestionIndex(resumeQuestionIndex);
                setResumeQuestionIndex(null);
            }
        }
    };

    const handleFileSubmit = async () => {
        if (!weightmentSlip) return;

        setMessages(prev => [...prev, {
            text: `📎 ${weightmentSlip.name}`,
            sender: 'user',
            field: 'weightmentSlip'
        }]);

        setMessages(prev => [
            ...prev,
            { text: language === 'hi' ? 'सबमिट किया जा रहा है...' : 'Submitting...', sender: 'bot' }
        ]);

        await submitInsuranceForm(weightmentSlip);
    };

    const currentQuestion = questions[currentQuestionIndex] || questions[questions.length - 1];
    const isFileInput = currentQuestion.type === 'file';
    const isSelectInput = currentQuestion.type === 'select';

    const isAddressInput = currentQuestion.type === 'address' ||
        (editingMessageIndex !== null &&
            (messages[editingMessageIndex].field === 'supplierAddress' ||
                messages[editingMessageIndex].field === 'buyerAddress'));

    return (
        <div
            className="flex flex-col bg-[#efeae2] overflow-hidden fixed inset-0"
            style={{ height: viewportHeight } as React.CSSProperties}
        >
            <div className="bg-[#075E54] text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow z-10 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={() => router.push('/home')} className="p-1 -ml-1 sm:-ml-2 rounded-full hover:bg-[#128C7E]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-2 rounded-full">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-base">Create Insurance Form</p>
                            <p className="text-xs opacity-90">Mandi Plus • Quick & Easy</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs opacity-90 hidden sm:inline">Online</span>
                </div>
            </div>

            {isCropping && imageSrc && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="flex-1 w-full relative min-h-0 bg-black">
                        <Cropper
                            src={imageSrc}
                            style={{ height: '100%', width: '100%' }}
                            ref={cropperRef}
                            initialAspectRatio={NaN}
                            guides={true}
                            viewMode={0}
                            dragMode="move"
                            responsive={true}
                            autoCropArea={1}
                            checkOrientation={true}
                            background={false}
                            ready={() => {
                                setIsCropperReady(true);
                                // Reset rotation when a new image is loaded
                                setRotation(0);
                            }}
                            minCropBoxHeight={10}
                            minCropBoxWidth={10}
                            autoCrop={true}
                            aspectRatio={1}
                            restore={false}
                            zoomable={true}
                            zoomOnWheel={true}
                            zoomOnTouch={true}
                            toggleDragModeOnDblclick={true}
                            cropBoxMovable={true}
                            cropBoxResizable={true}
                        />
                    </div>
                    <div className="w-full bg-black/90 p-4 pb-8 flex justify-between items-center px-6 shrink-0 z-50">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => rotateImage(-90)}
                                className="flex flex-col items-center text-white gap-1"
                                title="Rotate Left 90°"
                            >
                                <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                                    <ArrowPathIcon className="w-5 h-5 transform rotate-90" />
                                </div>
                                <span className="text-xs">⟲ Left</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => rotateImage(90)}
                                className="flex flex-col items-center text-white gap-1"
                                title="Rotate Right 90°"
                            >
                                <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                                    <ArrowPathIcon className="w-5 h-5 -scale-x-100 transform rotate-90" />
                                </div>
                                <span className="text-xs">⟳ Right</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCropping(false);
                                    setImageSrc(null);
                                    setWeightmentSlip(null);
                                    setRotation(0);
                                }}
                                className="flex flex-col items-center text-red-500 gap-1"
                            >
                                <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                                    <XMarkIcon className="w-6 h-6" />
                                </div>
                                <span className="text-xs">Cancel</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCropComplete}
                                disabled={!isCropperReady}
                                className={`flex flex-col items-center gap-1 transition-opacity ${isCropperReady ? 'opacity-100 text-[#25D366]' : 'opacity-50 text-gray-500'}`}
                            >
                                <div className={`p-2 rounded-full bg-gray-800 border ${isCropperReady ? 'border-[#25D366]' : 'border-gray-500'} hover:bg-gray-700`}>
                                    <CheckIcon className="w-6 h-6" />
                                </div>
                                <span className="text-xs">Done</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={chatContainerRef}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 relative scroll-smooth"
                style={{
                    backgroundColor: '#E5DDD5',
                    backgroundImage: "url('/images/whatsapp-bg.png')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '300px',
                }}
            >
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`flex animate-fadeIn ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className="flex items-center gap-2 max-w-[80%] sm:max-w-[75%]">
                            {m.sender === 'user' && m.field && !isSubmitting && (
                                <button
                                    onClick={() => handleEdit(m.field as string)}
                                    className={`p-2 rounded-full shadow-md transition-all duration-200 active:scale-95 ${editingMessageIndex === i
                                        ? 'bg-[#128C7E] text-white ring-2 ring-[#128C7E] ring-offset-2'
                                        : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-[#075E54]'
                                        }`}
                                    title="Edit"
                                >
                                    <PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            )}
                            <div
                                className={`px-4 py-3 text-[15px] rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${m.sender === 'user'
                                    ? 'bg-gradient-to-br from-[#dcf8c6] to-[#d4f0b8] rounded-br-sm text-gray-900'
                                    : 'bg-white rounded-bl-sm text-gray-800'
                                    } ${editingMessageIndex === i ? 'ring-2 ring-[#128C7E] ring-offset-1' : ''}`}
                            >
                                <div className="whitespace-pre-line leading-relaxed break-all">{m.text}</div>
                            </div>
                        </div>
                    </div>
                ))}

                {isSelectInput && !isSubmitting && !editingMessageIndex && currentQuestion.options && (
                    <div className="flex justify-start w-full animate-fadeIn">
                        <div className="w-[80%] sm:w-[75%] bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-100">
                            <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wider flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {language === 'hi' ? 'विकल्प चुनें' : 'Select an option'}
                            </p>
                            <div className="flex flex-wrap gap-2.5">
                                {currentQuestion.options.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleOptionSelect(opt)}
                                        className="bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:from-[#dcf8c6] hover:to-[#d4f0b8] hover:border-[#25D366] hover:text-gray-900 transition-all duration-200 active:scale-95 text-left flex-1 min-w-[120px] sm:min-w-[140px]"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {(!isSelectInput || editingMessageIndex !== null) && (
                <div className="bg-[#f0f0f0] px-2 sm:px-3 py-2 border-t z-10 shrink-0 relative">
                    {error && <p className="text-red-500 text-xs mb-1 px-1">{error}</p>}

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute bottom-full left-0 w-full bg-white border-t border-gray-200 shadow-lg max-h-48 overflow-y-auto z-50 mb-1">
                            {suggestions.map((place, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleAddressSelect(place)}
                                    className="p-3 border-b border-gray-100 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                                >
                                    {place.display_name}
                                </div>
                            ))}
                            <div className="p-1 text-right text-[10px] text-gray-400 bg-gray-50">
                                Powered by OpenStreetMap
                            </div>
                        </div>
                    )}

                    {isFileInput ? (
                        <div className="flex justify-center w-full">
                            {(!weightmentSlip || editingMessageIndex !== null) ? (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`bg-gradient-to-r from-[#25D366] to-[#20BA5A] text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-lg hover:from-[#20BA5A] hover:to-[#1DA851] transition-all duration-200 active:scale-95 font-semibold text-sm sm:text-base ${editingMessageIndex !== null ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                                    >
                                        <PaperClipIcon className="w-5 h-5" />
                                        <span className="hidden sm:inline">
                                            {language === 'hi'
                                                ? (editingMessageIndex !== null ? 'नयी पर्ची अपलोड करें' : 'वजन पर्ची अपलोड करें')
                                                : (editingMessageIndex !== null ? 'Upload new slip' : 'Upload weightment slip')}
                                        </span>
                                        <span className="sm:hidden">
                                            {language === 'hi' ? 'अपलोड' : 'Upload'}
                                        </span>
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 w-full">
                                    <div className="flex-1 bg-white rounded-full px-4 py-3 flex items-center justify-between border-2 border-gray-200 shadow-md">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-green-100 p-2 rounded-full">
                                                <PaperClipIcon className="w-5 h-5 text-green-600 shrink-0" />
                                            </div>
                                            <span className="text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs text-gray-700 font-medium">
                                                {weightmentSlip.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setWeightmentSlip(null)}
                                            className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleFileSubmit}
                                        disabled={isSubmitting}
                                        className="bg-gradient-to-r from-[#25D366] to-[#20BA5A] p-3 rounded-full text-white hover:from-[#20BA5A] hover:to-[#1DA851] shadow-lg transition-all duration-200 active:scale-95 min-w-[48px] flex items-center justify-center disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <ArrowUpIcon className="h-5 w-5 text-white" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex items-center gap-2 relative w-full">
                            <input
                                ref={textInputRef}
                                type={currentQuestion.type === 'language' ? 'text' : (currentQuestion.type === 'address' ? 'text' : currentQuestion.type)}
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (isAddressInput) {
                                        // Debounced fetch handles suggestions
                                    }
                                }}
                                placeholder={
                                    editingMessageIndex !== null
                                        ? (language === 'hi' ? 'यहाँ एडिट करें...' : 'Edit here...')
                                        : (isAddressInput
                                            ? (language === 'hi' ? 'पता टाइप करें...' : 'Start typing address...')
                                            : (currentQuestion.type === 'number'
                                                ? (language === 'hi' ? 'संख्या दर्ज करें...' : 'Enter a number...')
                                                : (language === 'hi' ? 'अपना उत्तर टाइप करें...' : 'Type your answer...')))
                                }
                                className={`flex-1 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none bg-white text-black border border-gray-200 ${editingMessageIndex !== null ? 'border-[#128C7E] border-2' : ''}`}
                                disabled={isSubmitting}
                                step={currentQuestion.step}
                                onFocus={() => {
                                    setTimeout(() => {
                                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                    }, 300);
                                }}
                            />
                            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        ref={textInputRef}
                                        type={currentQuestion.type === 'language' ? 'text' : currentQuestion.type}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={
                                            editingMessageIndex !== null
                                                ? (language === 'hi' ? 'यहाँ एडिट करें...' : 'Edit here...')
                                                : (currentQuestion.type === 'number'
                                                    ? (language === 'hi' ? 'संख्या दर्ज करें...' : 'Enter a number...')
                                                    : (language === 'hi' ? 'अपना उत्तर टाइप करें...' : 'Type your answer...'))
                                        }
                                        className={`w-full rounded-full px-5 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 bg-white text-black border-2 transition-all duration-200 ${editingMessageIndex !== null ? 'border-[#128C7E]' : 'border-gray-300 focus:border-[#25D366]'}`}
                                        disabled={isSubmitting}
                                        step={currentQuestion.step}
                                        onFocus={() => {
                                            setTimeout(() => {
                                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                            }, 300);
                                        }}
                                    />
                                    {isSubmitting && (
                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#25D366] border-t-transparent"></div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !inputValue.trim()}
                                    className={`p-3 rounded-full text-white shadow-lg transition-all duration-200 active:scale-95 min-w-[48px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${editingMessageIndex !== null
                                        ? 'bg-gradient-to-r from-[#128C7E] to-[#0e6b5e] hover:from-[#0e6b5e] hover:to-[#0a5a4e]'
                                        : 'bg-gradient-to-r from-[#25D366] to-[#20BA5A] hover:from-[#20BA5A] hover:to-[#1DA851]'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        <ArrowUpIcon className="h-5 w-5 text-white" />
                                    )}
                                </button>
                            </form>
                    )}
                            {!isFileInput && (
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    💡 {language === 'hi' ? 'टिप: अपना उत्तर टाइप करें और भेजें बटन दबाएं' : 'Tip: Type your answer and press send'}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            );
};

            export default Insurance;