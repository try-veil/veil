import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const LinkBankAccount = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Link Payouts account</CardTitle>
          <CardDescription>
            Connect your bank account to receive payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => setIsOpen(true)}>
            Link Bank Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payouts account</DialogTitle>
            <DialogDescription>
              A payout is a payment that you receive for your API being used
              when monetization is enabled. Without a linked account, Veil will
              hold on to your funds until an account is available to pay into.
              <br />
              <br />
              Our secure payment system currently only supports payouts with
              Razorpay. For more information about payouts visit our Docs.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full">Link Bank Account</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LinkBankAccount;
