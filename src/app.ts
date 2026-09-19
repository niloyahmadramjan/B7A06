import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { adminRouter } from "./app/module/admin/admin.route";
import { assignmentRouter } from "./app/module/assignment/assignment.route";
import { attachmentRouter } from "./app/module/attachment/attachment.route";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { CustomerRouter } from "./app/module/customers/customer.route";
import { dashboardRouter } from "./app/module/dashboard/dashboard.route";
import { feedbackRouter } from "./app/module/feedback/feedback.route";
import { invoiceRouter } from "./app/module/invoice/invoice.route";
import { paymentRouter } from "./app/module/payment/payment.router";
import { requestRouter } from "./app/module/request/request.route";
import { resourceRouter } from "./app/module/resource/resource.route";
import { ServiceRouter } from "./app/module/service/service.route";
import { serviceVisitRouter } from "./app/module/service-visit/service-visit.route";
import { technicianRouter } from "./app/module/technician/technician.route";
import { UsersRouter } from "./app/module/users/user.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/service", ServiceRouter);
app.use("/api/v1/customer", CustomerRouter);
app.use("/api/v1/request", requestRouter);
app.use("/api/v1/assignments", assignmentRouter);
app.use("/api/v1/attachments", attachmentRouter);
app.use("/api/v1/service-visits", serviceVisitRouter);
app.use("/api/v1/invoices", invoiceRouter);
app.use("/api/v1/technician", technicianRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/feedbacks", feedbackRouter);
app.use("/api/v1/users", UsersRouter);
app.use("/api/v1/resources", resourceRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/admin", adminRouter);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "User Authentication API is running",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
