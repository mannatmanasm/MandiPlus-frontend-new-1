'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowUpIcon, PaperClipIcon } from '@heroicons/react/24/outline';
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
    notes: string;
}

interface QuestionText {
    en: string;
    hi: string;
}

interface Question {
    field: keyof FormData | 'language' | 'weightmentSlip';
    type: 'text' | 'number' | 'language' | 'file';
    text: QuestionText;
    optional?: boolean;
    step?: string;
}

interface Message {
    text: string;
    sender: 'bot' | 'user';
}

// --- Constants ---

const questions: Question[] = [
    {
        field: 'language',
        type: 'language',
        text: {
            en: "Namaste! Select your language / नमस्ते! अपनी भाषा चुनें\nType 1 - English\nType 2 - हिंदी",
            hi: "Namaste! Select your language / नमस्ते! अपनी भाषा चुनें\nType 1 - English\nType 2 - हिंदी"
        }
    },
    {
        field: 'supplierName',
        type: 'text',
        text: {
            en: "Who is sending the goods? (Supplier Name)",
            hi: "माल भेजने वाली पार्टी का नाम क्या है?"
        }
    },
    {
        field: 'supplierAddress',
        type: 'text',
        text: {
            en: "Where are they from? (Supplier Address)",
            hi: "सप्लायर का एड्रेस कहाँ का है?"
        }
    },
    {
        field: 'placeOfSupply',
        type: 'text',
        text: {
            en: "Where does the delivery go? (Place of Supply)",
            hi: "माल कहाँ पहुँचाना है?"
        }
    },
    {
        field: 'buyerName',
        type: 'text',
        text: {
            en: "Who is buying? (Buyer Party Name)",
            hi: "माल खरीदने वाली पार्टी का नाम क्या है?"
        }
    },
    {
        field: 'buyerAddress',
        type: 'text',
        text: {
            en: "What is the Buyer's address?",
            hi: "खरीदने वाली पार्टी का एड्रेस बताइये।"
        }
    },
    {
        field: 'itemName',
        type: 'text',
        text: {
            en: "What is the item? (e.g., Rice, Wheat)",
            hi: "माल में क्या आइटम है? (जैसे - चावल, गेहूं)"
        }
    },
    {
        field: 'hsn',
        type: 'text',
        text: {
            en: "Do you know the HSN code?",
            hi: "अगर HSN कोड पता है तो बता दीजिये।"
        }
    },
    {
        field: 'quantity',
        type: 'number',
        step: "0.01",
        text: {
            en: "How much quantity/weight?",
            hi: "कितना माल है?"
        }
    },
    {
        field: 'rate',
        type: 'number',
        step: "0.01",
        text: {
            en: "What is the rate/price?",
            hi: "क्या भाव लगा है?"
        }
    },
    {
        field: 'vehicleNumber',
        type: 'text',
        text: {
            en: "What is the vehicle number?",
            hi: "गाड़ी नंबर क्या है?"
        }
    },
    {
        field: 'notes',
        type: 'text',
        optional: true,
        text: {
            en: "Any other details? (Optional)",
            hi: "कोई और खास बात या नोट? (वैकल्पिक)"
        }
    },
    {
        field: 'weightmentSlip',
        type: 'file',
        optional: true,
        text: {
            en: "Upload the Weightment Slip (Kanta Parchi)",
            hi: "कांटा पर्ची की फोटो भेजें (वैकल्पिक)"
        }
    },
];

const Insurance = () => {
    const router = useRouter(); // Changed from useNavigate
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<FormData>({
        supplierName: '',
        supplierAddress: '',
        placeOfSupply: '',
        buyerName: '',
        buyerAddress: '',
        itemName: 'Tender Coconut',
        hsn: '08011910',
        quantity: '',
        rate: '',
        vehicleNumber: '',
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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* ========================= SUBMIT ========================= */
    const submitInsuranceForm = async (fileArgument: File | null = null) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        setMessages(prev => [
            ...prev,
            { text: 'Submitting details...', sender: 'bot' },
        ]);

        try {
            const submitData = new FormData();

            // --- 1. GENERATED FIELDS ---
            submitData.append('invoiceNumber', `INV-${Date.now()}`);
            submitData.append('invoiceDate', new Date().toISOString());
            submitData.append('placeOfSupply', formData.placeOfSupply || 'State');

            // --- 2. ARRAY FIELDS (Use [] suffix) ---
            const supAddr = formData.supplierAddress || 'Unknown Address';
            submitData.append('supplierAddress[]', supAddr);

            const buyAddr = formData.buyerAddress || 'Unknown Address';
            submitData.append('billToAddress[]', buyAddr);
            submitData.append('shipToAddress[]', buyAddr);

            const prodName = formData.itemName || 'Item';
            submitData.append('productName[]', prodName);

            // --- 3. STRING FIELDS ---
            submitData.append('supplierName', formData.supplierName || 'Unknown Supplier');
            submitData.append('billToName', formData.buyerName || 'Unknown Buyer');
            submitData.append('shipToName', formData.buyerName || 'Unknown Buyer');

            // --- 4. NUMERIC FIELDS ---
            const qty = formData.quantity ? Number(formData.quantity) : 0;
            const rate = formData.rate ? Number(formData.rate) : 0;
            const amount = qty * rate;

            submitData.append('quantity', String(qty));
            submitData.append('rate', String(rate));
            submitData.append('amount', String(amount));

            // --- 5. OPTIONAL FIELDS ---
            if (formData.vehicleNumber) {
                submitData.append('vehicleNumber', formData.vehicleNumber);
                submitData.append('truckNumber', formData.vehicleNumber);
            }
            if (formData.hsn) submitData.append('hsnCode', formData.hsn);
            if (formData.notes) submitData.append('weighmentSlipNote', formData.notes);

            // --- 6. FILE UPLOAD ---
            const finalFile = fileArgument || weightmentSlip;
            if (finalFile) {
                submitData.append('weighmentSlips', finalFile);
            }

            // Call API
            const invoice = await createInsuranceForm(submitData);

            // --- FIX: Correctly Read Response ---
            // The backend might return 'pdfUrl' (camelCase) or 'pdfURL'. check both.
            const rawPdfUrl = invoice.pdfUrl || invoice.pdfURL;

            setMessages(prev => [
                ...prev,
                { text: 'Success! Invoice created.', sender: 'bot' }
            ]);

            if (rawPdfUrl) {
                // If it's a Cloudinary link, use it directly. If local, add prefix.
                const finalLink = rawPdfUrl.startsWith('http')
                    ? rawPdfUrl
                    : `http://localhost:3000${rawPdfUrl}`;

                window.location.href = finalLink;
            } else {
                // PDF is generating in background (Async)
                setMessages(prev => [
                    ...prev,
                    { text: 'PDF is generating... Redirecting to My Forms.', sender: 'bot' }
                ]);
                setTimeout(() => {
                    router.refresh();
                    router.push('/my-insurance-forms');
                    
                
                }, 2000);
            }

        } catch (err: any) {
            console.error(err);
            let errorMsg = 'Submission failed.';
            if (err.message) {
                if (Array.isArray(err.message)) {
                    errorMsg = err.message.join(', ');
                } else {
                    errorMsg = err.message;
                }
            }
            setMessages(prev => [
                ...prev,
                { text: errorMsg, sender: 'bot' },
            ]);
            setIsSubmitting(false);
        }
    };

    /* ========================= FLOW ========================= */
    const getQuestionText = (question: Question) => {
        return language ? question.text[language] : question.text.en;
    };

    const goToNextQuestion = () => {
        const currentQuestion = questions[currentQuestionIndex];

        // Skip itemName and hsn questions as they have default values
        let nextIndex = currentQuestionIndex + 1;
        if (currentQuestion.field === 'buyerAddress') {
            // After buyerAddress, skip to quantity
            nextIndex = questions.findIndex(q => q.field === 'quantity');

            // Add auto-filled values to messages
            setMessages(prev => [
                ...prev,
                { text: 'Tender Coconut', sender: 'user' },
                { text: getQuestionText(questions[questions.findIndex(q => q.field === 'hsn')]), sender: 'bot' },
                { text: '08011910', sender: 'user' }
            ]);
        }

        if (nextIndex < questions.length) {
            setCurrentQuestionIndex(nextIndex);
            const nextQuestion = questions[nextIndex];
            setMessages(prev => [...prev, {
                text: getQuestionText(nextQuestion),
                sender: 'bot'
            }]);

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

        // Handle language selection
        if (q.field === 'language') {
            if (currentInput === '1' || currentInput === '2') {
                const selectedLanguage = currentInput === '1' ? 'en' : 'hi';
                const languageName = selectedLanguage === 'en' ? 'English' : 'हिंदी';

                setLanguage(selectedLanguage);
                setMessages(prev => [
                    ...prev,
                    { text: languageName, sender: 'user' },
                    {
                        text: questions[1].text[selectedLanguage],
                        sender: 'bot'
                    }
                ]);
                setInputValue('');
                setCurrentQuestionIndex(1);
                return;
            } else {
                setError('Please type 1 or 2 / कृपया 1 या 2 टाइप करें');
                return;
            }
        }

        if (!q.optional && !currentInput) {
            setError(language === 'hi' ? 'यह फ़ील्ड आवश्यक है' : 'This field is required');
            return;
        }

        setError('');

        // Handle form data updates excluding special fields like 'language' or 'weightmentSlip'
        // which are not directly inside the formData state object in the same way
        // Add this type guard function at the top level of your component
        const isFormField = (field: keyof FormData | 'language' | 'weightmentSlip'): field is keyof FormData => {
            return field !== 'language' && field !== 'weightmentSlip';
        };

        // Then in your handleSubmit function:
        if (isFormField(q.field)) {
            const valueToStore = (q.type === 'number' && currentInput)
                ? parseFloat(currentInput)
                : currentInput;
            setFormData(prev => ({ ...prev, [q.field]: valueToStore }));
        }

        setMessages(prev => [...prev, { text: currentInput, sender: 'user' }]);
        setInputValue('');
        goToNextQuestion();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Update state (for UI display if needed later)
        setWeightmentSlip(file);

        setMessages(prev => [...prev, { text: `📎 ${file.name}`, sender: 'user' }]);

        setMessages(prev => [
            ...prev,
            {
                text: language === 'hi'
                    ? 'सबमिट किया जा रहा है...'
                    : 'Submitting...',
                sender: 'bot'
            }
        ]);

        await submitInsuranceForm(file);
    };

    const currentQuestion = questions[currentQuestionIndex];
    const isFileInput = currentQuestion.type === 'file';

    return (
        <div className="flex flex-col h-screen bg-[#efeae2]">
            {/* WhatsApp Header - (No changes here) */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/home')}
                        className="p-1 -ml-2 rounded-full hover:bg-[#128C7E] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div className="w-9 h-9 rounded-full bg-gray-300" />
                    <div>
                        <p className="font-medium leading-none">Mandi Plus</p>
                        <p className="text-xs opacity-80">online</p>
                    </div>
                </div>
            </div>

            {/* Chat Area - FIXED */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative"
                style={{
                    // 1. Use a solid background color + the image
                    backgroundColor: "#E5DDD5",
                    // 2. Add the pattern
                    backgroundImage: "url('/images/whatsapp-bg.png')",
                    backgroundRepeat: 'repeat',
                    // 3. REMOVED 'opacity: 0.6' - This was the cause!
                }}
            >
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[75%] px-3 py-2 text-sm rounded-lg shadow-sm ${m.sender === 'user'
                                    ? 'bg-[#dcf8c6] rounded-br-none text-black' // Added text-black
                                    : 'bg-white rounded-bl-none text-black'     // Added text-black
                                }`}
                        >
                            <div className="whitespace-pre-line">{m.text}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar - FIXED */}
            <div className="bg-[#f0f0f0] px-3 py-2 border-t z-10">
                {error && <p className="text-red-500 text-xs mb-1">{error}</p>}

                {isFileInput ? (
                    <div className="flex justify-center">
                        {!weightmentSlip ? (
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
                                    className="bg-[#25D366] text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-sm hover:bg-[#20bd5a]"
                                >
                                    <PaperClipIcon className="w-4 h-4" />
                                    {language === 'hi' ? 'वजन पर्ची अपलोड करें' : 'Upload weightment slip'}
                                </button>
                            </>
                        ) : (
                            <button
                                className="bg-[#25D366] text-white px-4 py-2 rounded-full flex items-center gap-2 opacity-50 cursor-not-allowed"
                                disabled
                            >
                                {language === 'hi' ? 'सबमिट हो रहा है...' : 'Submitting...'}
                            </button>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <input
                            type={currentQuestion.type === 'language' ? 'text' : currentQuestion.type}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={currentQuestion.type === 'number'
                                ? (language === 'hi' ? 'संख्या दर्ज करें...' : 'Enter a number...')
                                : (language === 'hi' ? 'अपना उत्तर टाइप करें...' : 'Type your answer...')}
                            className="flex-1 rounded-full px-4 py-2 text-sm focus:outline-none bg-white text-black border border-gray-200"
                            disabled={isSubmitting}
                            step={currentQuestion.step}
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#25D366] p-2 rounded-full text-white hover:bg-[#20bd5a] shadow-sm transition-colors"
                        >
                            <ArrowUpIcon className="h-5 w-5 text-white" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Insurance;