import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ContentSection from "@/features/settings/components/content-section";
export default function Gateway() {
  return (
    <ContentSection
      title='Gateway'
      desc='lorem ipsum lorem ipsum lorem ipsum lorem ipsum'
    >
      <form className="space-y-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Firewall Settings</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Protect your API by blocking requests that are not from the
              RapidAPI infrastructure. RapidAPI adds the
              &quot;X-RapidAPI-Proxy-Secret&quot; header on every request. This
              header has a unique value for each API.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Proxy Secret</Label>
            <PasswordInput
              placeholder="Enter your proxy secret"
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Request Configurations</h3>
          </div>

          <div className="space-y-4 rounded-lg border p-4 w-fit">
            <div className="space-y-2 flex flex-row gap-8">
              <div className="space-y-2">
                <Label>Request Size Limit</Label>
                <p className="text-sm text-muted-foreground">
                  Configure the request message size
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-[120px]"
                    min="0"
                    max="50"
                  />
                  <Select defaultValue="MB">
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MB">MB</SelectItem>
                      <SelectItem value="KB">KB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Max value is 50 MB
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-lg border p-4 w-fit">
            <div className="space-y-2 flex flex-row gap-8">
              <div className="space-y-2">
                <Label>Proxy Timeout Setting</Label>
                <p className="text-sm text-muted-foreground">
                  Configure the timeout between the proxy and the target
                  endpoints
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-[120px]"
                    min="0"
                    max="50"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Max value is 180 Sec
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button variant="outline" type="button">
            Discard Changes
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </ContentSection>
  );
}
