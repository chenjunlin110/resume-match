package main

import (
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// CORS（开发期全放行）
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	// 最大上传 12MB
	r.MaxMultipartMemory = 12 << 20

	r.POST("/api/upload", func(c *gin.Context) {
		jdText := c.PostForm("jd_text")
		if jdText == "" {
			c.JSON(400, gin.H{"error": "missing jd_text"})
			return
		}
		fileHeader, err := c.FormFile("resume_file")
		if err != nil {
			c.JSON(400, gin.H{"error": "missing resume_file"})
			return
		}

		src, err := fileHeader.Open()
		if err != nil {
			c.JSON(400, gin.H{"error": "cannot open uploaded file"})
			return
		}
		defer src.Close()

		mlURL := os.Getenv("ML_URL")
		if mlURL == "" {
			mlURL = "http://ml:8000/api/score_file"
		}

		// 用 io.Pipe 流式传输
		pr, pw := io.Pipe()
		writer := multipart.NewWriter(pw)

		go func() {
			// 正确关闭顺序：先关闭 writer 再关闭 pipe
			defer func() {
				if err := writer.Close(); err != nil {
					_ = pw.CloseWithError(err)
					return
				}
				_ = pw.Close()
			}()

			if err := writer.WriteField("jd_text", jdText); err != nil {
				_ = pw.CloseWithError(err)
				return
			}

			part, err := writer.CreateFormFile("resume_file", fileHeader.Filename)
			if err != nil {
				_ = pw.CloseWithError(err)
				return
			}
			if _, err := io.Copy(part, src); err != nil {
				_ = pw.CloseWithError(err)
				return
			}
		}()

		req, err := http.NewRequest(http.MethodPost, mlURL, pr)
		if err != nil {
			c.JSON(502, gin.H{"error": "ml request build failed"})
			return
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		client := &http.Client{Timeout: 120 * time.Second} // 增加超时时间以支持LLM处理
		resp, err := client.Do(req)
		if err != nil {
			log.Println("ml service error:", err)
			c.JSON(502, gin.H{"error": "ml service unreachable"})
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, "application/json; charset=utf-8", body)
	})

	// 流式输出API
	r.POST("/api/upload_stream", func(c *gin.Context) {
		jdText := c.PostForm("jd_text")
		if jdText == "" {
			c.JSON(400, gin.H{"error": "missing jd_text"})
			return
		}
		fileHeader, err := c.FormFile("resume_file")
		if err != nil {
			c.JSON(400, gin.H{"error": "missing resume_file"})
			return
		}

		src, err := fileHeader.Open()
		if err != nil {
			c.JSON(400, gin.H{"error": "cannot open uploaded file"})
			return
		}
		defer src.Close()

		mlURL := os.Getenv("ML_URL")
		if mlURL == "" {
			mlURL = "http://ml:8000/api/score_file_stream"
		}

		// 用 io.Pipe 流式传输
		pr, pw := io.Pipe()
		writer := multipart.NewWriter(pw)

		go func() {
			defer func() {
				if err := writer.Close(); err != nil {
					_ = pw.CloseWithError(err)
					return
				}
				_ = pw.Close()
			}()

			if err := writer.WriteField("jd_text", jdText); err != nil {
				_ = pw.CloseWithError(err)
				return
			}

			part, err := writer.CreateFormFile("resume_file", fileHeader.Filename)
			if err != nil {
				_ = pw.CloseWithError(err)
				return
			}
			if _, err := io.Copy(part, src); err != nil {
				_ = pw.CloseWithError(err)
				return
			}
		}()

		req, err := http.NewRequest(http.MethodPost, mlURL, pr)
		if err != nil {
			c.JSON(502, gin.H{"error": "ml request build failed"})
			return
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		client := &http.Client{Timeout: 600 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Println("ml service error:", err)
			c.JSON(502, gin.H{"error": "ml service unreachable"})
			return
		}
		defer resp.Body.Close()

		// 设置流式响应头
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Access-Control-Allow-Origin", "*")

		// 流式转发响应
		buffer := make([]byte, 1024)
		for {
			n, err := resp.Body.Read(buffer)
			if n > 0 {
				c.Data(200, "text/event-stream", buffer[:n])
				c.Writer.Flush()
			}
			if err != nil {
				break
			}
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Println("backend listening on :" + port)
	_ = r.Run(":" + port)
}
