"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@/contexts/UserContext";
import { CheckCircle, AlertCircle, Loader2, CreditCard, Edit2, Trash2, Star } from "lucide-react";

interface PaymentMethod {
    id: string;
    cardNumber: string; // Last 4 digits
    expiryDate: string;
    cardType: string;
    country: string;
    isDefault: boolean;
}

export default function BillingInformationContent() {
    const [cardNumber, setCardNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [securityCode, setSecurityCode] = useState("");
    const [country, setCountry] = useState("India");
    const [setAsDefault, setSetAsDefault] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState("");
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [editingCard, setEditingCard] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isLoadingMethods, setIsLoadingMethods] = useState(true);
    const { user } = useUser();

    // Load existing payment methods with localStorage persistence
    useEffect(() => {
        const saved = localStorage.getItem("paymentMethods");
        if (saved) {
            try {
                const parsedMethods = JSON.parse(saved);
                setPaymentMethods(parsedMethods);
                setIsLoadingMethods(false);
            } catch (error) {
                console.error("Error parsing saved payment methods:", error);
                loadPaymentMethods(); // Fallback to mock data
            }
        } else {
            loadPaymentMethods(); // Initial mock load
        }
    }, []);

    // Save to localStorage whenever paymentMethods changes
    useEffect(() => {
        // if (paymentMethods.length > 0) {
            localStorage.setItem("paymentMethods", JSON.stringify(paymentMethods));
        // }
    }, [paymentMethods]);

    // const loadPaymentMethods = async () => {
    //     setIsLoadingMethods(true);
        
    //     // Simulate loading existing payment methods
    //     // Replace with actual API call
    //     const mockPaymentMethods: PaymentMethod[] = [
    //         {
    //             id: "1",
    //             cardNumber: "**** **** **** 1234",
    //             expiryDate: "12/25",
    //             cardType: "VISA",
    //             country: "India",
    //             isDefault: true
    //         },
    //         {
    //             id: "2",
    //             cardNumber: "**** **** **** 5678",
    //             expiryDate: "08/26",
    //             cardType: "MC",
    //             country: "United States",
    //             isDefault: false
    //         }
    //     ];

    //     // Simulate API delay
    //     setTimeout(() => {
    //         setPaymentMethods(mockPaymentMethods);
    //         setIsLoadingMethods(false);
    //     }, 500);
    // };

    const loadPaymentMethods = async () => {
        setIsLoadingMethods(true);
        const saved = localStorage.getItem("paymentMethods");
        if (saved) {
        try {
        const parsed = JSON.parse(saved);
        setPaymentMethods(parsed);
        setIsLoadingMethods(false);
        return; // prevent mock overwrite
        } catch {
        // fall through to mock
        }
        }
        const mockPaymentMethods: PaymentMethod[] = [
        { id: "1", cardNumber: "** ** **** 1234", expiryDate: "12/25", cardType: "VISA", country: "India", isDefault: true },
        { id: "2", cardNumber: "** ** **** 5678", expiryDate: "08/26", cardType: "MC", country: "United States", isDefault: false },
        ];
        setTimeout(() => {
        setPaymentMethods(mockPaymentMethods);
        setIsLoadingMethods(false);
        }, 500);
        };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Validate card number (basic length check)
        const cleanCardNumber = cardNumber.replace(/\s/g, '');
        if (!cleanCardNumber) {
            newErrors.cardNumber = "Card number is required";
        } else if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
            newErrors.cardNumber = "Please enter a valid card number";
        }

        // Validate expiry date
        if (!expiryDate) {
            newErrors.expiryDate = "Expiry date is required";
        } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            newErrors.expiryDate = "Please enter a valid expiry date (MM/YY)";
        } else {
            const [month, year] = expiryDate.split('/').map(Number);
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear() % 100;
            const currentMonth = currentDate.getMonth() + 1;

            if (month < 1 || month > 12) {
                newErrors.expiryDate = "Please enter a valid month (01-12)";
            } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
                newErrors.expiryDate = "Card has expired";
            }
        }

        // Validate security code
        if (!securityCode) {
            newErrors.securityCode = "Security code is required";
        } else if (securityCode.length < 3) {
            newErrors.securityCode = "Security code must be 3 digits";
        }

        // Validate country
        if (!country) {
            newErrors.country = "Please select a country";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Format card number with spaces
        const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
        if (value.length <= 19) { // 16 digits + 3 spaces
            setCardNumber(value);
        }
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Format expiry date as MM/YY
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 4) {
            const formatted = value.length >= 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value;
            setExpiryDate(formatted);
        }
    };

    const handleSecurityCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 3) {
            setSecurityCode(value);
        }
    };

    const handleAddCard = async () => {
        // Clear previous messages
        setErrors({});
        setSuccessMessage("");

        // Validate form
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // Simulate API call (replace with actual API call later)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create new payment method
            const newPaymentMethod: PaymentMethod = {
                id: Date.now().toString(),
                cardNumber: `**** **** **** ${cardNumber.slice(-4)}`,
                expiryDate,
                cardType: getCardType(cardNumber),
                country,
                isDefault: setAsDefault
            };

            // If setting as default, update other cards
            if (setAsDefault) {
                setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: false })));
            }

            // Add new payment method
            setPaymentMethods(prev => [...prev, newPaymentMethod]);

            setSuccessMessage("Card added successfully! Your payment method has been saved.");

            // Clear form and hide add form
            setCardNumber("");
            setExpiryDate("");
            setSecurityCode("");
            setSetAsDefault(false);
            setShowAddForm(false);

        } catch (error) {
            console.error("Error adding card:", error);
            setErrors({ general: "Failed to add card. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const getCardType = (cardNumber: string): string => {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        if (cleanNumber.startsWith('4')) return 'VISA';
        if (cleanNumber.startsWith('5')) return 'MC';
        if (cleanNumber.startsWith('3')) return 'AMEX';
        return 'VISA'; // Default
    };

    const handleDeleteCard = async (cardId: string) => {
        if (confirm('Are you sure you want to delete this payment method?')) {
            setPaymentMethods(prev => prev.filter(pm => pm.id !== cardId));
            setSuccessMessage("Payment method deleted successfully.");
        }
    };

    const handleSetDefault = async (cardId: string) => {
        setPaymentMethods(prev => prev.map(pm => ({
            ...pm,
            isDefault: pm.id === cardId
        })));
        setSuccessMessage("Default payment method updated.");
    };

    const handleEditCard = (cardId: string) => {
        const card = paymentMethods.find(pm => pm.id === cardId);
        if (card) {
            setEditingCard(cardId);
            setExpiryDate(card.expiryDate);
            setCountry(card.country);
            setShowAddForm(true);
        }
    };

    const handleUpdateCard = async () => {
        if (!editingCard) return;

        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            setPaymentMethods(prev => prev.map(pm =>
                pm.id === editingCard
                    ? { ...pm, expiryDate, country }
                    : pm
            ));

            setSuccessMessage("Payment method updated successfully.");
            setEditingCard(null);
            setShowAddForm(false);
            setExpiryDate("");
            setCountry("India");

        } catch (error) {
            setErrors({ general: "Failed to update card. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex w-full items-center justify-center pt-24 pb-4">
            <div className="flex h-[calc(100vh-7rem)] w-full max-w-4xl flex-col px-2">
                {/* Header Section */}
                <div className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Billing Information
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-auto py-6">
                    <div className="max-w-4xl space-y-6">
                        {/* Success Message */}
                        {successMessage && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    {successMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Existing Payment Methods */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Payment Methods</CardTitle>
                                    <Button
                                        type="button"
                                        onClick={() => setShowAddForm(!showAddForm)}
                                        variant={showAddForm ? "outline" : "default"}
                                    >
                                        {showAddForm ? "Cancel" : "Add New Card"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoadingMethods ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" />
                                        <p>Loading payment methods...</p>
                                    </div>
                                ) : paymentMethods.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                        <p>No payment methods added yet.</p>
                                        <p className="text-sm">Add your first card to get started.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {paymentMethods.map((method) => (
                                            <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-gray-100 rounded">
                                                        <CreditCard className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{method.cardNumber}</span>
                                                            <div className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                                                {method.cardType}
                                                            </div>
                                                            {method.isDefault && (
                                                                <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                                    <Star className="h-3 w-3" />
                                                                    Default
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Expires {method.expiryDate} • {method.country}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!method.isDefault && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSetDefault(method.id)}
                                                        >
                                                            Set Default
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditCard(method.id)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteCard(method.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Add/Edit Card Form */}
                        {showAddForm && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {editingCard ? "Update Card Details" : "Add New Card"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* General Error */}
                                    {errors.general && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                {errors.general}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Card Number - Only show when adding new card */}
                                    {!editingCard && (
                                        <div className="space-y-2">
                                            <Label htmlFor="cardNumber">Card number</Label>
                                            <div className="relative">
                                                <Input
                                                    id="cardNumber"
                                                    placeholder="1234 1234 1234 1234"
                                                    value={cardNumber}
                                                    onChange={handleCardNumberChange}
                                                    className={`pr-20 ${errors.cardNumber ? 'border-red-500' : ''}`}
                                                />
                                                {errors.cardNumber && (
                                                    <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
                                                )}
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                                    <div className="text-xs bg-blue-600 text-white px-1 py-0.5 rounded">VISA</div>
                                                    <div className="text-xs bg-red-600 text-white px-1 py-0.5 rounded">MC</div>
                                                    <div className="text-xs bg-blue-800 text-white px-1 py-0.5 rounded">AMEX</div>
                                                    <div className="text-xs bg-gray-600 text-white px-1 py-0.5 rounded">DC</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Expiry Date and Security Code */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="expiryDate">Expiry date</Label>
                                            <Input
                                                id="expiryDate"
                                                placeholder="MM/YY"
                                                value={expiryDate}
                                                onChange={handleExpiryChange}
                                                className={errors.expiryDate ? 'border-red-500' : ''}
                                            />
                                            {errors.expiryDate && (
                                                <p className="text-sm text-red-500 mt-1">{errors.expiryDate}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="securityCode">Security code</Label>
                                            {!editingCard && (
                                                <div className="relative">
                                                    <Input
                                                        id="securityCode"
                                                        placeholder="CVC"
                                                        value={securityCode}
                                                        onChange={handleSecurityCodeChange}
                                                        className={errors.securityCode ? 'border-red-500' : ''}
                                                    />
                                                    {errors.securityCode && (
                                                        <p className="text-sm text-red-500 mt-1">{errors.securityCode}</p>
                                                    )}
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <div className="text-xs text-muted-foreground">123</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Country */}
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Select value={country} onValueChange={setCountry}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="India">India</SelectItem>
                                                <SelectItem value="United States">United States</SelectItem>
                                                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                                <SelectItem value="Canada">Canada</SelectItem>
                                                <SelectItem value="Australia">Australia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Set as Default - Only show when adding new card */}
                                    {!editingCard && (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="setAsDefault"
                                                checked={setAsDefault}
                                                onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
                                            />
                                            <Label htmlFor="setAsDefault" className="text-sm">
                                                Set as default payment method
                                            </Label>
                                        </div>
                                    )}

                                    {/* Info Text */}
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>Your card details will be saved for future purchases and subscription renewals.</p>
                                        {!editingCard && (
                                            <p>
                                                RapidAPI will validate your card by placing a temporary authorization hold of $0.50, this
                                                temporary hold will be automatically released after several days.
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            onClick={editingCard ? handleUpdateCard : handleAddCard}
                                            className="flex-1"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {editingCard ? "Updating..." : "Adding Card..."}
                                                </>
                                            ) : (
                                                <>
                                                    {editingCard ? "Update Card" : "Add Card"} →
                                                </>
                                            )}
                                        </Button>
                                        {editingCard && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingCard(null);
                                                    setShowAddForm(false);
                                                    setExpiryDate("");
                                                    setCountry("India");
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}