import { Response } from 'express';

// JSend response format
export interface JSendResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  data?: T;
  message?: string;
  code?: string;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    [key: string]: any;
  };
}

export class ApiResponse {
  static success<T>(res: Response, data: T, message?: string, meta?: any): Response {
    const response: JSendResponse<T> = {
      status: 'success',
      data,
      ...(message && { message }),
      ...(meta && { meta }),
    };
    return res.status(200).json(response);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    const response: JSendResponse<T> = {
      status: 'success',
      data,
      ...(message && { message }),
    };
    return res.status(201).json(response);
  }

  static fail(res: Response, message: string, code: string = 'VALIDATION_ERROR', statusCode: number = 400): Response {
    const response: JSendResponse = {
      status: 'fail',
      message,
      code,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500): Response {
    const response: JSendResponse = {
      status: 'error',
      message,
      code,
    };
    return res.status(statusCode).json(response);
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    const response: JSendResponse = {
      status: 'fail',
      message,
      code: 'NOT_FOUND',
    };
    return res.status(404).json(response);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    const response: JSendResponse = {
      status: 'fail',
      message,
      code: 'UNAUTHORIZED',
    };
    return res.status(401).json(response);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    const response: JSendResponse = {
      status: 'fail',
      message,
      code: 'FORBIDDEN',
    };
    return res.status(403).json(response);
  }

  static conflict(res: Response, message: string = 'Conflict'): Response {
    const response: JSendResponse = {
      status: 'fail',
      message,
      code: 'CONFLICT',
    };
    return res.status(409).json(response);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): Response {
    const pages = Math.ceil(total / limit);

    const response: JSendResponse<T[]> = {
      status: 'success',
      data,
      ...(message && { message }),
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      },
    };
    return res.status(200).json(response);
  }
}

export default ApiResponse;