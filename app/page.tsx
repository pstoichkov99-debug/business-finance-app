import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, FileText, CreditCard, Building2, FolderKanban, LineChart } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Business Finance Manager</h1>
          <p className="text-muted-foreground">Manage your business finances with ease</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/accounts">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Accounts</CardTitle>
                </div>
                <CardDescription>Manage bank accounts, credit cards, and cash</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/transactions">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Transactions</CardTitle>
                </div>
                <CardDescription>Record income, expenses, and transfers</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/budget">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Budget</CardTitle>
                </div>
                <CardDescription>Track budgets with VAT calculations</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/debts">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Debts</CardTitle>
                </div>
                <CardDescription>Track loans and credit obligations</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/assets">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Assets</CardTitle>
                </div>
                <CardDescription>Manage your business assets</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/projects">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderKanban className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Projects</CardTitle>
                </div>
                <CardDescription>Track project budgets and finances</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/cash-flow-summary">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <LineChart className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Cash Flow Planning</CardTitle>
                </div>
                <CardDescription>Plan future payments and receipts from all projects</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
