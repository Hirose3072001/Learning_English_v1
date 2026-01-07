import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DuoMascot } from "@/components/icons/DuoMascot";
import { Link } from "react-router-dom";
import { Sparkles, Trophy, Users, Zap } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Học nhanh chóng",
    description: "Các bài học ngắn gọn, hiệu quả chỉ trong 5 phút mỗi ngày",
  },
  {
    icon: Trophy,
    title: "Gamification",
    description: "Kiếm XP, lên cấp và cạnh tranh với bạn bè trên bảng xếp hạng",
  },
  {
    icon: Users,
    title: "Cộng đồng",
    description: "Tham gia hàng triệu người học trên toàn thế giới",
  },
  {
    icon: Sparkles,
    title: "Miễn phí",
    description: "Học ngôn ngữ hoàn toàn miễn phí, mọi lúc mọi nơi",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary px-4 pb-16 pt-12">
        <div className="mx-auto max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <DuoMascot size="xl" />
            
            <h1 className="mt-6 text-4xl font-black text-primary-foreground">
              LingoMaster
            </h1>
            <p className="mt-3 text-lg font-semibold text-primary-foreground/90">
              Học ngôn ngữ miễn phí.
              <br />
              Vui vẻ. Hiệu quả.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/register">Bắt đầu học ngay</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/login">Tôi đã có tài khoản</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-40 rounded-full bg-primary-foreground/10" />
        <div className="pointer-events-none absolute -right-10 top-1/2 size-32 rounded-full bg-primary-foreground/10" />
      </section>

      {/* Features Section */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-lg">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-2xl font-bold text-foreground"
          >
            Tại sao chọn LingoMaster?
          </motion.h2>

          <div className="mt-8 grid gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 rounded-2xl border-2 border-border bg-card p-4 shadow-duo-card"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted px-4 py-12">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Tham gia cùng hàng triệu người học trên toàn thế giới
          </p>
          <Button asChild size="xl" className="mt-6 w-full">
            <Link to="/register">Đăng ký miễn phí</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-6">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 LingoMaster. Made with ❤️
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
