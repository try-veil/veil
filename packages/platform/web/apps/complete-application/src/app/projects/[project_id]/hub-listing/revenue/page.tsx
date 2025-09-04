import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { columns } from "@/features/users/components/users-columns";
import { UsersDialogs } from "@/features/users/components/users-dialogs";
import { UsersPrimaryButtons } from "@/features/users/components/users-primary-buttons";
import { UsersTable } from "@/features/users/components/users-table";
import UsersProvider from "@/features/users/context/users-context";
import { userListSchema } from "@/features/users/data/schema";
import { users } from "@/features/users/data/users";

export default function Users() {
  // Parse user list
  const userList = userListSchema.parse(users);

  return (
    <>
      <UsersProvider>
        <Main>
          <div className="mb-2 mt-4 flex flex-wrap items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
              <p className="text-muted-foreground">
                View your project's subsriptions and revenue details.
              </p>
            </div>
          </div>
          <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
            <UsersTable data={userList} columns={columns} />
          </div>
        </Main>
        <UsersDialogs />
      </UsersProvider>
    </>
  );
}
