
import type { Request, Response, NextFunction } from "express";
import { registerUser , loginUser} from "./auth.service.js";
import type { RegisterUserInput,LoginUserInput} from "./auth.validation.js";

export async function registerController(req: Request, res: Response, next: NextFunction, ): Promise<void> {
  try {
    const input = req.body as RegisterUserInput;

    const user = await registerUser(input);

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction,): Promise<void> {
  try {
    const input = req.body as LoginUserInput;
    const user = await loginUser(input);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}