export class ApiResponse {
  static success(res, data, statusCode = 200, message = 'OK') {
    return res.status(statusCode).json({ success: true, message, data });
  }
  static created(res, data, message = 'Created') {
    return res.status(201).json({ success: true, message, data });
  }
  static noContent(res) { return res.status(204).end(); }
  static paginate(res, { items, total, page, pages, limit }) {
    return res.json({ success: true, data: items, pagination: { total, page, pages, limit } });
  }
}
