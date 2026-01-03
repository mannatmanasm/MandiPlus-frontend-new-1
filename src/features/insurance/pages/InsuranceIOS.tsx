'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowUpIcon,
    PaperClipIcon,
    PencilSquareIcon,
    CheckIcon,
    XMarkIcon,
    ArrowPathIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import Cropper, { ReactCropperElement } from 'react-cropper';
import "cropperjs/dist/cropper.css";
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
    ownerName: string; // Added ownerName
    cashOrCommission: string;
    notes: string;
}

interface QuestionText {
    en: string;
    hi: string;
}

interface Question {
    field: keyof FormData | 'language' | 'weightmentSlip';
    type: 'text' | 'number' | 'language' | 'file' | 'select';
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

// --- Data: Items and HSN Codes ---
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
    {
        field: 'supplierName',
        type: 'text',
        text: {
            en: "Supplier Kaun",
            hi: "माल भेजने वाला"
        }
    },
    {
        field: 'supplierAddress',
        type: 'text',
        text: {
            en: "Place of Supply/Supply kahan se",
            hi: "भेजने वाले का पता"
        }
    },
    {
        field: 'buyerName',
        type: 'text',
        text: {
            en: "Party Ka Naam",
            hi: "पार्टी का नाम"
        }
    },
    {
        field: 'buyerAddress',
        type: 'text',
        text: {
            en: "Party Address",
            hi: "पार्टी का पता"
        }
    },
    {
        field: 'itemName',
        type: 'select', // Changed to select
        options: itemsData.map(item => item.name),
        text: {
            en: "Select Item",
            hi: "आइटम चुनें"
        }
    },
    {
        field: 'quantity',
        type: 'number',
        step: "0.01",
        text: {
            en: "Kitna Maal",
            hi: "कुल मात्रा/QTY"
        }
    },
    {
        field: 'rate',
        type: 'number',
        step: "0.01",
        text: {
            en: "Kya Bhaav Lgaya",
            hi: "रेट/भाव"
        }
    },
    {
        field: 'vehicleNumber',
        type: 'text',
        text: {
            en: "Gaadi No.",
            hi: "गाड़ी नंबर"
        }
    },
    {
        field: 'ownerName', // Added Owner Name Question
        type: 'text',
        text: {
            en: "Transporter Ka Naam",
            hi: "ट्रांसपोर्टर का नाम"
        }
    },
    {
        field: 'notes',
        type: 'select',
        options: ['Cash', 'Commission'],
        optional: true,
        text: {
            en: "Cash ya Commission",
            hi: "नकद या कमीशन"
        }
    },
    {
        field: 'weightmentSlip',
        type: 'file',
        optional: true,
        text: {
            en: "Kanta Parchi Photo",
            hi: "कांटा पर्ची"
        }
    },
];

/* ---------------- COMPONENT ---------------- */

const InsuranceIOS = () => {
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
        itemName: '', // Removed default
        hsn: '',      // Removed default
        quantity: '',
        rate: '',
        vehicleNumber: '',
        ownerName: '', // Added to state
        cashOrCommission: '',
        notes: '',
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

    // Viewport States
    const [viewportHeight, setViewportHeight] = useState<string>('100vh');
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null);
    const lastHeight = useRef<number>(0);

    // Edit States
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [resumeQuestionIndex, setResumeQuestionIndex] = useState<number | null>(null);

    // Cropper States
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const cropperRef = useRef<ReactCropperElement>(null);
    const [isCropperReady, setIsCropperReady] = useState(false);

    // --- Viewport Logic (Preserved) ---
    useEffect(() => {
        if (typeof window === 'undefined') return; // !('visualViewport' in window) removed for broader compat, check inside

        if (!window.visualViewport) return;

        const visualViewport = window.visualViewport;

        const updateViewport = () => {
            const newHeight = visualViewport.height;
            const offsetTop = visualViewport.offsetTop;

            if (Math.abs(newHeight - lastHeight.current) > 1) {
                lastHeight.current = newHeight;
                setViewportHeight(`${newHeight}px`);

                const keyboardVisible = newHeight < window.innerHeight * 0.7;
                if (keyboardVisible !== isKeyboardVisible) {
                    setIsKeyboardVisible(keyboardVisible);
                    if (keyboardVisible) {
                        setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                    }
                }
            }

            if (viewportRef.current) {
                viewportRef.current.style.transform = `translateY(${offsetTop}px)`;
            }
        };

        const handleScroll = (e: Event) => {
            if (visualViewport.pageTop > 0) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'auto' });
                return false;
            }
            return true;
        };

        updateViewport();
        visualViewport.addEventListener('resize', updateViewport);
        visualViewport.addEventListener('scroll', updateViewport);
        window.addEventListener('scroll', handleScroll, { passive: false });

        return () => {
            visualViewport.removeEventListener('resize', updateViewport);
            visualViewport.removeEventListener('scroll', updateViewport);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isKeyboardVisible]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Helpers ---
    const currentQuestion = questions[currentQuestionIndex];
    const isFileInput = currentQuestion.type === 'file';
    const isSelectInput = currentQuestion.type === 'select';

    // --- API Submission ---
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

            // submitData.append('invoiceNumber', `INV-${Date.now()}`);
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
            // Added Owner Name
            submitData.append('ownerName', formData.ownerName || 'Unknown Owner');

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

    // --- Edit Logic ---
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
        } else if (fieldToEdit === 'language') {
            setInputValue(language === 'en' ? '1' : '2');
        } else {
            const val = formData[fieldToEdit as keyof FormData];
            setInputValue(val ? String(val) : '');
        }

        setTimeout(() => textInputRef.current?.focus(), 100);
    };

    // --- Flow Logic ---
    const getQuestionText = (question: Question) => {
        return language ? question.text[language] : question.text.en;
    };

    const goToNextQuestion = () => {
        const currentQuestion = questions[currentQuestionIndex];
        let nextIndex = currentQuestionIndex + 1;

        if (currentQuestion.field === 'buyerAddress') {
            nextIndex = questions.findIndex(q => q.field === 'quantity');
            setMessages(prev => [...prev, { text: 'Tender Coconut', sender: 'user', field: 'itemName' }]);
        }

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = questions[currentQuestionIndex];
        const currentInput = inputValue.trim();

        // Validation
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

        // Handle Language
        if (q.field === 'language') {
            const selectedLanguage = currentInput === '1' ? 'en' : 'hi';
            setLanguage(selectedLanguage);
            if (editingMessageIndex !== null) {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[editingMessageIndex!] = { ...newMsgs[editingMessageIndex!], text: selectedLanguage === 'en' ? 'English' : 'हिंदी' };
                    return newMsgs;
                });
                setEditingMessageIndex(null);
                setInputValue('');
                if (resumeQuestionIndex !== null) setCurrentQuestionIndex(resumeQuestionIndex);
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

        // Store Data
        if (isFormField(q.field)) {
            const valueToStore = (q.type === 'number' && currentInput) ? parseFloat(currentInput) : currentInput;

            // Logic to auto-select HSN
            if (q.field === 'itemName') {
                const selectedItem = itemsData.find(item => item.name === currentInput);
                const hsnCode = selectedItem ? selectedItem.hsn : '';
                setFormData(prev => ({ ...prev, itemName: currentInput, hsn: hsnCode }));
            } else {
                setFormData(prev => ({ ...prev, [q.field]: valueToStore }));
            }
        }

        // Handle Editing vs Normal
        if (editingMessageIndex !== null) {
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[editingMessageIndex!] = { ...newMsgs[editingMessageIndex!], text: currentInput };
                return newMsgs;
            });
            setEditingMessageIndex(null);
            setInputValue('');
            if (resumeQuestionIndex !== null) setCurrentQuestionIndex(resumeQuestionIndex);
        } else {
            setMessages(prev => [...prev, { text: currentInput, sender: 'user', field: q.field }]);
            setInputValue('');
            goToNextQuestion();
        }
    };

    // --- Image Handling ---
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

    const handleRotate = () => {
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
            cropper.rotate(90);
        }
    };

    const handleCropComplete = () => {
        const cropper = cropperRef.current?.cropper;
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas();
        if (!canvas) {
            console.error("Canvas was null");
            return;
        }

        canvas.toBlob(async (blob: Blob | null) => {
            if (!blob) return;
            const croppedFile = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
            setWeightmentSlip(croppedFile);
            setIsCropping(false);

            if (editingMessageIndex !== null) {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[editingMessageIndex!] = {
                        ...newMsgs[editingMessageIndex!],
                        text: `📎 ${croppedFile.name} (Edited)`
                    };
                    return newMsgs;
                });
                setEditingMessageIndex(null);
                if (resumeQuestionIndex !== null) setCurrentQuestionIndex(resumeQuestionIndex);
            }
        }, 'image/jpeg');
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
            {
                text: language === 'hi' ? 'सबमिट किया जा रहा है...' : 'Submitting...',
                sender: 'bot'
            }
        ]);

        await submitInsuranceForm(weightmentSlip);
    };

    return (
        <div
            ref={viewportRef}
            className="fixed top-0 left-0 right-0 flex flex-col bg-[#efeae2] overflow-hidden"
            style={{
                height: viewportHeight,
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'none',
                transform: 'translateZ(0)'
            }}
        >
            {/* Header */}
            <div className="bg-[#075E54] text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow z-10 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-1 -ml-1 sm:-ml-2 rounded-full hover:bg-[#128C7E] transition-colors touch-manipulation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0">
                        <img className="w-full h-full rounded-full object-cover" src="/images/logo.jpeg" alt="" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium leading-none text-sm sm:text-base truncate">Mandi Plus</p>
                        <p className="text-xs opacity-80">online</p>
                    </div>
                </div>
            </div>

            {/* --- CROPPER OVERLAY (Absolute over everything) --- */}
            {isCropping && imageSrc && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col">
                    <div className="flex-1 w-full relative min-h-0 bg-black">
                        <Cropper
                            src={imageSrc}
                            style={{ height: '100%', width: '100%' }}
                            ref={cropperRef}
                            initialAspectRatio={NaN}
                            guides={true}
                            viewMode={1}
                            dragMode="move"
                            responsive={true}
                            autoCropArea={0.9}
                            checkOrientation={false}
                            background={false}
                            ready={() => setIsCropperReady(true)}
                            minCropBoxHeight={10}
                            minCropBoxWidth={10}
                        />
                    </div>

                    <div className="w-full bg-black/90 p-4 pb-8 flex justify-between items-center px-6 shrink-0 z-50">
                        <button
                            type="button"
                            onClick={() => { setIsCropping(false); setImageSrc(null); setWeightmentSlip(null); }}
                            className="flex flex-col items-center text-red-500 gap-1"
                        >
                            <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                                <XMarkIcon className="w-6 h-6" />
                            </div>
                            <span className="text-xs">Cancel</span>
                        </button>

                        {/* <button
                            type="button"
                            onClick={handleRotate}
                            className="flex flex-col items-center text-white gap-1"
                        >
                            <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                                <ArrowPathIcon className="w-6 h-6" />
                            </div>
                            <span className="text-xs">Rotate</span>
                        </button> */}

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
            )}

            {/* CHAT CONTAINER */}
            <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                style={{
                    backgroundImage: 'url("/images/whatsapp-bg.png")',
                    backgroundSize: 'cover',
                    backgroundAttachment: 'fixed',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    paddingBottom: isKeyboardVisible ? 'env(safe-area-inset-bottom, 20px)' : '0'
                }}
                ref={chatContainerRef}
            >
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className="flex items-center gap-2 max-w-[80%]">
                            {/* Pencil Icon for User Messages */}
                            {message.sender === 'user' && message.field && !isSubmitting && (
                                <button
                                    onClick={() => handleEdit(message.field as string)}
                                    className={`p-1.5 rounded-full shadow-sm transition-all ${editingMessageIndex === index
                                            ? 'bg-[#128C7E] text-white'
                                            : 'bg-white/80 text-gray-500 hover:bg-white hover:text-[#075E54]'
                                        }`}
                                    title="Edit"
                                >
                                    <PencilSquareIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                            )}

                            <div
                                className={`rounded-lg px-3 py-2 text-sm shadow-sm ${message.sender === 'user'
                                    ? 'bg-[#dcf8c6] rounded-br-none text-black'
                                    : 'bg-white rounded-bl-none text-black'
                                    } ${editingMessageIndex === index ? 'ring-2 ring-[#128C7E]' : ''}`}
                            >
                                <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div
                className="border-t bg-[#f0f0f0] p-2 flex-none"
                style={{
                    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
                    paddingLeft: 'max(env(safe-area-inset-left, 0px), 8px)',
                    paddingRight: 'max(env(safe-area-inset-right, 0px), 8px)'
                }}
            >
                {error && <p className="text-red-500 text-xs mb-1 px-2">{error}</p>}

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
                                    className={`bg-[#25D366] text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-sm hover:bg-[#20bd5a] text-sm ${editingMessageIndex !== null ? 'ring-2 ring-blue-500' : ''}`}
                                >
                                    <PaperClipIcon className="w-5 h-5" />
                                    <span>
                                        {language === 'hi'
                                            ? (editingMessageIndex !== null ? 'नयी पर्ची अपलोड करें' : 'वजन पर्ची अपलोड करें')
                                            : (editingMessageIndex !== null ? 'Upload new slip' : 'Upload weightment slip')}
                                    </span>
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 w-full">
                                <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center justify-between border border-gray-200">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <PaperClipIcon className="w-4 h-4 text-gray-500 shrink-0" />
                                        <span className="text-xs sm:text-sm truncate max-w-[150px] sm:max-w-xs text-gray-700">
                                            {weightmentSlip.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setWeightmentSlip(null)}
                                        className="text-red-500 p-1 hover:bg-gray-100 rounded-full"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <button
                                    onClick={handleFileSubmit}
                                    disabled={isSubmitting}
                                    className="bg-[#25D366] p-2.5 rounded-full text-white hover:bg-[#20bd5a] shadow-sm"
                                >
                                    <ArrowUpIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                        {isSelectInput && currentQuestion.options ? (
                            <select
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className={`flex-1 rounded-full px-4 py-2 text-sm focus:outline-none bg-white text-black border border-gray-200 appearance-none ${editingMessageIndex !== null ? 'border-[#128C7E] border-2' : ''}`}
                                disabled={isSubmitting}
                            >
                                <option value="">{language === 'hi' ? 'चुनें...' : 'Select...'}</option>
                                {currentQuestion.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex-1 relative">
                                <input
                                    ref={textInputRef}
                                    type={currentQuestion.type === 'number' ? 'number' : 'text'}
                                    step={currentQuestion.step}
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    className={`w-full border rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-black ${editingMessageIndex !== null ? 'border-[#128C7E] border-2' : ''}`}
                                    style={{ WebkitAppearance: 'none' }}
                                    inputMode={currentQuestion.type === 'number' ? 'decimal' : 'text'}
                                    placeholder={
                                        editingMessageIndex !== null
                                            ? (language === 'hi' ? 'यहाँ एडिट करें...' : 'Edit here...')
                                            : (currentQuestion.type === 'number'
                                                ? (language === 'hi' ? 'संख्या दर्ज करें...' : 'Enter a number...')
                                                : (language === 'hi' ? 'अपना उत्तर टाइप करें...' : 'Type your answer...'))
                                    }
                                    disabled={isFileInput || isSubmitting}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || (!inputValue.trim() && !isSelectInput)}
                            className={`p-2.5 rounded-full text-white shadow-sm transition-colors min-w-[40px] flex items-center justify-center ${editingMessageIndex !== null
                                    ? 'bg-[#128C7E] hover:bg-[#0e6b5e]'
                                    : 'bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50'
                                }`}
                        >
                            <ArrowUpIcon className="w-5 h-5" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default InsuranceIOS;