"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BillingOverview() {
    const router = useRouter();

    return (
        <div className="flex w-full items-center justify-center pt-24 pb-4">
            <div className="flex h-[calc(100vh-7rem)] w-full max-w-6xl flex-col px-2">
                {/* Header Section */}
                <div className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Billing & Payments
                            </h1>
                            <p className="text-muted-foreground">
                                Manage your credits, payment methods, and billing information
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-auto py-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Purchase Credits Card */}
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Wallet className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Purchase Credits</CardTitle>
                                        <CardDescription>
                                            Buy credits and view your transaction history
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        • View current wallet balance
                                        • Purchase additional credits
                                        • Track transaction history
                                        • Manage credit usage
                                    </p>
                                    <Button
                                        onClick={() => router.push('/billing/purchase-credits')}
                                        className="w-full"
                                    >
                                        Manage Credits
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Billing Information Card */}
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <CreditCard className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Billing Information</CardTitle>
                                        <CardDescription>
                                            Manage payment methods and billing details
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        • Add and manage payment cards
                                        • Update billing address
                                        • Set default payment method
                                        • View invoice details
                                    </p>
                                    <Button
                                        onClick={() => router.push('/billing/billing-information')}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Manage Payment Methods
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Stats Section */}
                    {/* <div className="mt-8">
                        <h2 className="text-lg font-semibold mb-4">Quick Overview</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">164</div>
                                    <p className="text-xs text-muted-foreground">Available Credits</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">0</div>
                                    <p className="text-xs text-muted-foreground">Payment Methods</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">Active</div>
                                    <p className="text-xs text-muted-foreground">Account Status</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    );
}