package server

import (
	"fmt"
	"net/http"
	"os"
	"strconv"

	"server/internal/config"
)

const (
	defaultPort = "8080"
)

type Server struct {
	cfg    *config.Config
	router *http.ServeMux
}

func NewServer(cfg *config.Config) *Server {
	return &Server{
		cfg:    cfg,
		router: http.NewServeMux(),
	}
}

// Handle registers a new route with a handler
func (s *Server) Handle(pattern string, handler http.Handler) {
	s.router.Handle(pattern, handler)
}

func (s *Server) Start() error {
	port := getPort(s.cfg)
	addr := fmt.Sprintf("%s:%s", s.cfg.Host, port)
	return http.ListenAndServe(addr, s.router)
}

func getPort(cfg *config.Config) string {
	if cfg.Port != 0 {
		return strconv.Itoa(cfg.Port)
	}
	if port := os.Getenv("PORT"); port != "" {
		return port
	}
	return defaultPort
}
